import { Output, Resource } from '@pulumi/pulumi';

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
import { GetValue } from '../utilities';
import { cidrHost } from '../utilities';
export let virtualMachine: VirtualMachine | undefined;
export let networkInterface: NetworkInterface | undefined;

export type CloudflareConnectorInput = {
  user: {
    username: string | Output<string>;
    password: string | Output<string>;
  };
  subnetId?: string | Output<string>;
  resourceGroup: ResourceGroup;
  tunnelToken: string;
  vmSize: string;
};
export async function setup(input: CloudflareConnectorInput): Promise<boolean> {
  //create nic
  networkInterface = new NetworkInterface('cloudflare-connector-nic', {
    resourceGroupName: input.resourceGroup.name,
    location: input.resourceGroup.location,
    enableIPForwarding: true,
    ipConfigurations: [
      {
        name: 'internal',
        subnet: {
          id: input.subnetId,
        },
        privateIPAllocationMethod: 'Dynamic',
      },
    ],
  });
  //create vm
  let virtualMachineDependencies: Resource[] = [networkInterface];
  virtualMachine = new VirtualMachine(
    'cloudflare-connector-vm',
    {
      vmName: 'cloudflare-connector',
      hardwareProfile: {
        vmSize: input.vmSize,
      },
      diagnosticsProfile: {
        bootDiagnostics: {
          enabled: true,
        },
      },
      resourceGroupName: input.resourceGroup.name,
      location: input.resourceGroup.location,
      networkProfile: {
        networkInterfaces: [
          {
            id: networkInterface.id,
          },
        ],
      },
      osProfile: {
        adminUsername: input.user.username,
        adminPassword: input.user.password,
        computerName: 'cloudflare-connector',
        customData: GetCloudInitCustomData(input.tunnelToken),
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
      dependsOn: virtualMachineDependencies,
      replaceOnChanges: ['osProfile'],
      deleteBeforeReplace: true,
    },
  );
  return true;
}

// private functions
function GetCloudInitCustomData(tunnelToken: string): string {
  const cloudInitConfig = `
#cloud-config
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
  - warp-cli --accept-tos connector new ${tunnelToken}
  - warp-cli --accept-tos connect
`;
  return Buffer.from(cloudInitConfig).toString('base64');
}
