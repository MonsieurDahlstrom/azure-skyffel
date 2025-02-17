// pulumi imports
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
//cloudflare imports
import * as cloudflare from '@pulumi/cloudflare';
//azure-native imports
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
// private imports
import { GetValue } from '../utilities';

export let virtualMachine: VirtualMachine;
export let networkInterface: NetworkInterface;

export type CloudflaredInput = {
  user: {
    username: string;
    password: pulumi.Output<string>;
  };
  routeCidr: string | pulumi.Output<string>;
  cloudflare: {
    account: string;
    zone?: string;
  };
  subnetId?: string | pulumi.Output<string>;
  resourceGroup: ResourceGroup;
  vmSize: string;
};

export async function setup(input: CloudflaredInput): Promise<boolean> {
  const tunnelSecret = new random.RandomBytes('tunnel-secret', {
    length: 32,
  });
  const tunnelSecretValue = await GetValue(tunnelSecret.base64);
  const vnetTunnel = new cloudflare.ZeroTrustTunnelCloudflared(`vnet-tunnel`, {
    accountId: input.cloudflare.account,
    name: pulumi.interpolate`Tunnel to ${input.routeCidr}`,
    secret: tunnelSecretValue,
    configSrc: 'cloudflare',
  });
  const vnetTunnelToken = await GetValue(vnetTunnel.tunnelToken);
  const vnetRoute = new cloudflare.ZeroTrustTunnelRoute('vnet-route', {
    accountId: input.cloudflare.account,
    network: input.routeCidr,
    tunnelId: vnetTunnel.id,
    comment: pulumi.interpolate`Route to ${input.routeCidr}`,
  });
  //create nic
  let networkInterfaceDependencies: pulumi.Resource[] = [];
  networkInterface = new NetworkInterface(
    'cloudflare-connector-nic',
    {
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
    },
    {
      dependsOn: networkInterfaceDependencies,
    },
  );
  //create vm
  let virtualMachineDependencies: pulumi.Resource[] = [
    networkInterface,
    vnetTunnel,
  ];
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
        customData: GetCloudInitCustomData(vnetTunnelToken),
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
    },
  );
  return true;
}

function GetCloudInitCustomData(cloudflared_tunnel_token: string): string {
  const cloudInitConfig = `
#cloud-config
package_update: true
runcmd:
    - curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    - sudo dpkg -i cloudflared.deb
    - sudo cloudflared service install ${cloudflared_tunnel_token}
    `;
  return Buffer.from(cloudInitConfig).toString('base64');
}
