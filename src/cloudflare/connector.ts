import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import * as azure from '@pulumi/azure-native';
import * as random from '@pulumi/random';
import { cidrHost } from '../network/core.js';

export function createCloudflareConnector(
  resourceGroup: azure.resources.ResourceGroup,
  subnet: { id: string; addressPrefix: string },
  token: string,
  user: { username: string; password: string } | undefined,
): [azure.compute.VirtualMachine, azure.network.NetworkInterface] {
  const networkInterface = new azure.network.NetworkInterface(
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
          privateIPAddress: cidrHost(subnet.addressPrefix, 4),
        },
      ],
    },
  );
  const password = new random.RandomPassword('password', {
    length: 16,
    special: true,
    overrideSpecial: '!#$%&*()-_=+[]{}<>:?',
  });
  const virtualMachine = new azure.compute.VirtualMachine(
    'cloudflare-connector-vm',
    {
      vmName: 'cloudflare-connector',
      hardwareProfile: {
        vmSize: azure.compute.VirtualMachineSizeTypes.Standard_B2ms,
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
            patchMode: azure.compute.LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: azure.compute.SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      storageProfile: {
        osDisk: {
          caching: azure.compute.CachingTypes.ReadWrite,
          createOption: azure.compute.DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType: azure.compute.StorageAccountTypes.Standard_LRS,
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
  );
  /*
  const virtualMachineEntraExtension = new azure.compute.VirtualMachineExtension('virtualMachineExtension', {});
  const virtualMachineCloudflareExtension =
    new azure.compute.VirtualMachineExtension('cloudflared', {
      vmName: virtualMachine.name,
      resourceGroupName: resourceGroup.name,
      publisher: 'Microsoft.Azure.Extensions',
      type: 'CustomScript',
      typeHandlerVersion: '2.1',
      settings: {
        script: b64Encode(`
        curl https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
        sudo apt-get update && sudo apt-get install cloudflare-warp -y
        sudo sysctl -w net.ipv4.ip_forward=1

        warp-cli --accept-tos connector new ${token}
        warp-cli --accept-tos connect`),
      },
    });
  */
  return [virtualMachine, networkInterface];
}

function b64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}
