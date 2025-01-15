import * as pulumi from '@pulumi/pulumi';
import { Output } from '@pulumi/pulumi';

import * as cloudflare from '@pulumi/cloudflare';
import {
  VirtualNetwork,
  Subnet,
  NetworkInterface,
} from '@pulumi/azure-native/network';
import {
  VirtualMachine,
  LinuxVMGuestPatchMode,
  SecurityTypes,
  CachingTypes,
  DiskCreateOptionTypes,
  StorageAccountTypes,
} from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import * as random from '@pulumi/random';
import { cidrHost } from '../network/core.js';

function GetValue<T>(output: Output<T>) {
  return new Promise<T>((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}

export async function createCloudflareConnector(
  resourceGroup: ResourceGroup,
  subnet: Subnet,
  token: string,
  user: { username: string; password: string } | undefined,
): Promise<[VirtualMachine, NetworkInterface]> {
  const addressPrefix = await GetValue(
    subnet.addressPrefix.apply((prefix) => prefix),
  );
  if (!addressPrefix) throw new Error('Subnet address prefix not found');
  const networkInterface = new NetworkInterface(
    'cloudflare-connector-nic',
    {
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      enableIPForwarding: true,
      ipConfigurations: [
        {
          name: 'internal',
          subnet: {
            id: subnet.id,
          },
          privateIPAllocationMethod: 'Static',
          privateIPAddress: cidrHost(addressPrefix, 4),
        },
      ],
    },
    {
      dependsOn: [subnet],
    },
  );
  const password = new random.RandomPassword('password', {
    length: 16,
    special: true,
    overrideSpecial: '!#$%&*()-_=+[]{}<>:?',
  });
  const virtualMachine = new VirtualMachine(
    'cloudflare-connector-vm',
    {
      vmName: 'cloudflare-connector',
      hardwareProfile: {
        vmSize: 'Standard_D2_v5',
      },
      diagnosticsProfile: {
        bootDiagnostics: {
          enabled: true,
        },
      },
      resourceGroupName: resourceGroup.name,
      location: resourceGroup.location,
      networkProfile: {
        networkInterfaces: [
          {
            id: networkInterface.id,
          },
        ],
      },
      osProfile: {
        adminUsername: user ? user.username : 'cloudflared',
        adminPassword: user ? user.password : password.result,
        computerName: 'cloudflare-connector',
        customData: b64Encode(`#cloud-config
apt:
  sources:
    cloudflare:
      source: deb [arch="amd64"] https://pkg.cloudflareclient.com/ $RELEASE main
      keyid: 6E2DD2174FA1C3BA
      keyserver: 'https://pkg.cloudflareclient.com/pubkey.gpg'
package_update: true
packages:
  - cloudflare-warp
runcmd:
  - sudo sysctl -w net.ipv4.ip_forward=1
  - warp-cli --accept-tos connector new ${token}
  - warp-cli --accept-tos connect
          `),
        linuxConfiguration: {
          patchSettings: {
            patchMode: LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      storageProfile: {
        osDisk: {
          caching: CachingTypes.ReadWrite,
          createOption: DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType: StorageAccountTypes.Standard_LRS,
          },
          name: 'cloudflare-connector-osdisk',
        },
        imageReference: {
          publisher: 'Canonical',
          offer: 'ubuntu-24_04-lts',
          sku: 'server',
          version: 'latest',
        },
      },
    },
    {
      dependsOn: [networkInterface, subnet],
    },
  );
  return [virtualMachine, networkInterface];
}

function b64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}
