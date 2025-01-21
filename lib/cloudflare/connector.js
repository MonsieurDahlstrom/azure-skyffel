'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.networkInterface = exports.virtualMachine = void 0;
exports.setup = setup;
const network_1 = require('@pulumi/azure-native/network');
const compute_1 = require('@pulumi/azure-native/compute');
const core_js_1 = require('../network/core.js');
async function setup(input) {
  const addressPrefix = await GetValue(
    input.subnet.addressPrefix.apply((prefix) => prefix),
  );
  if (!addressPrefix) throw new Error('Subnet address prefix not found');
  //create nic
  exports.networkInterface = new network_1.NetworkInterface(
    'cloudflare-connector-nic',
    {
      resourceGroupName: input.resourceGroup.name,
      location: input.resourceGroup.location,
      enableIPForwarding: true,
      ipConfigurations: [
        {
          name: 'internal',
          subnet: {
            id: input.subnet.id,
          },
          privateIPAllocationMethod: 'Static',
          privateIPAddress: (0, core_js_1.cidrHost)(addressPrefix, 4),
        },
      ],
    },
    {
      dependsOn: [input.subnet],
    },
  );
  //create vm
  exports.virtualMachine = new compute_1.VirtualMachine(
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
            id: exports.networkInterface.id,
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
            patchMode: compute_1.LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: compute_1.SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      storageProfile: {
        osDisk: {
          caching: compute_1.CachingTypes.ReadWrite,
          createOption: compute_1.DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType: compute_1.StorageAccountTypes.Standard_LRS,
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
      dependsOn: [exports.networkInterface, input.subnet],
    },
  );
  return true;
}
// private functions
function GetCloudInitCustomData(tunnelToken) {
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
function GetValue(output) {
  return new Promise((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}
//# sourceMappingURL=connector.js.map
