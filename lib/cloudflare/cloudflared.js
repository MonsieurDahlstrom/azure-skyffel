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
exports.networkInterface = exports.virtualMachine = void 0;
exports.setup = setup;
// pulumi imports
const pulumi = __importStar(require('@pulumi/pulumi'));
const random = __importStar(require('@pulumi/random'));
//cloudflare imports
const cloudflare = __importStar(require('@pulumi/cloudflare'));
//azure-native imports
const network_1 = require('@pulumi/azure-native/network');
const compute_1 = require('@pulumi/azure-native/compute');
// private imports
const utilities_1 = require('../utilities');
async function setup(input) {
  const tunnelSecret = new random.RandomBytes('tunnel-secret', {
    length: 32,
  });
  const tunnelSecretValue = await (0, utilities_1.GetValue)(
    tunnelSecret.base64,
  );
  const vnetTunnel = new cloudflare.ZeroTrustTunnelCloudflared(`vnet-tunnel`, {
    accountId: input.cloudflare.account,
    name: pulumi.interpolate`Tunnel to ${input.routeCidr}`,
    secret: tunnelSecretValue,
    configSrc: 'cloudflare',
  });
  const vnetTunnelConfiguration =
    -new cloudflare.ZeroTrustTunnelCloudflaredConfig(
      'vnet-tunnel-configuration',
      {
        accountId: input.cloudflare.account,
        tunnelId: vnetTunnel.id,
        config: {
          warpRouting: {
            enabled: true,
          },
          ingressRules: input.ingresses,
        },
      },
    );
  const vnetTunnelToken = await (0, utilities_1.GetValue)(
    vnetTunnel.tunnelToken,
  );
  const vnetRoute = new cloudflare.ZeroTrustTunnelRoute('vnet-route', {
    accountId: input.cloudflare.account,
    network: input.routeCidr,
    tunnelId: vnetTunnel.id,
    comment: pulumi.interpolate`Route to ${input.routeCidr}`,
  });
  //create nic
  let networkInterfaceDependencies = [];
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
  let virtualMachineDependencies = [exports.networkInterface, vnetTunnel];
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
        customData: GetCloudInitCustomData(vnetTunnelToken),
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
      dependsOn: virtualMachineDependencies,
      replaceOnChanges: ['osProfile'],
      deleteBeforeReplace: true,
    },
  );
  return true;
}
function GetCloudInitCustomData(cloudflared_tunnel_token) {
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
//# sourceMappingURL=cloudflared.js.map
