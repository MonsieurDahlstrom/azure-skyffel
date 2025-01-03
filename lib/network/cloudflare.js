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
exports.createCloudflareZTNASubnet = createCloudflareZTNASubnet;
const azure = __importStar(require('@pulumi/azure-native'));
function createCloudflareZTNASubnet(virtualNetwork, resourceGroup, cidr) {
  // Create a new Cloudflare Zero Trust Network subnet
  const subnet = new azure.network.Subnet('cloudflare-ztna-gateway', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: cidr,
  });
  const routeTable = new azure.network.RouteTable(
    'cloudflare-ztna-route-table',
    {
      resourceGroupName: resourceGroup.name,
      routes: [],
    },
  );
  const nsg = new azure.network.NetworkSecurityGroup('cloudflare-ztna-nsg', {
    resourceGroupName: resourceGroup.name,
    securityRules: [
      {
        name: 'allow-ztna-ssh',
        access: 'Allow',
        direction: 'Inbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '22',
        sourceAddressPrefix: '100.96.0.0/12',
        destinationAddressPrefix: '*',
        priority: 100,
        description: 'Allow SSH from ZTNA',
      },
      {
        name: 'allow-https',
        access: 'Allow',
        direction: 'Inbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '100.96.0.0/12',
        destinationAddressPrefix: '*',
        priority: 110,
        description: 'Allow HTTPS traffic from ZTNA',
      },
      {
        name: 'allow-https',
        access: 'Allow',
        direction: 'Outbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '*',
        destinationAddressPrefix: '*',
        description: 'Allow Outbound HTTPS traffic',
        priority: 120,
      },
    ],
  });
  return [subnet, nsg, routeTable];
}
//# sourceMappingURL=cloudflare.js.map
