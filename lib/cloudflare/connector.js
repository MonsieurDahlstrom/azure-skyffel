'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.createCloudflareConnector = createCloudflareConnector;
const azure = __importStar(require('@pulumi/azure-native'));
const random = __importStar(require('@pulumi/random'));
const core_js_1 = require('../network/core.js');
async function createCloudflareConnector(resourceGroup, subnet, token) {
  let addressPrefix = '';
  await subnet.addressPrefix.apply((addressPrefixValue) => {
    if (addressPrefixValue != undefined) addressPrefix = addressPrefixValue;
  });
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
          privateIPAddress: (0, core_js_1.cidrHost)(addressPrefix, 4),
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
        adminUsername: 'cloudflared',
        adminPassword: password.result,
        computerName: 'cloudflare-connector',
        linuxConfiguration: {
          patchSettings: {
            patchMode: azure.compute.LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
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
  //const virtualMachineEntraExtension = new azure.compute.VirtualMachineExtension('virtualMachineExtension', {});
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
  return [virtualMachine];
}
function b64Encode(str) {
  return Buffer.from(str).toString('base64');
}
//# sourceMappingURL=connector.js.map
