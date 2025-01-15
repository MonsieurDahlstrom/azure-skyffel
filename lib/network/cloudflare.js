'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createCloudflareZTNASubnet = createCloudflareZTNASubnet;
const network_1 = require('@pulumi/azure-native/network');
const network_2 = require('@pulumi/azure-native/network');
const network_3 = require('@pulumi/azure-native/network');
function createCloudflareZTNASubnet(virtualNetwork, resourceGroup, cidr) {
  // Create a new Cloudflare Zero Trust Network subnet
  const subnet = new network_1.Subnet('cloudflare-ztna-gateway', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: cidr,
  });
  const routeTable = new network_3.RouteTable('cloudflare-ztna-route-table', {
    resourceGroupName: resourceGroup.name,
    routes: [],
  });
  const nsg = new network_2.NetworkSecurityGroup('cloudflare-ztna-nsg', {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    securityRules: [
      /*
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
        */
    ],
  });
  return [subnet, nsg, routeTable];
}
//# sourceMappingURL=cloudflare.js.map
