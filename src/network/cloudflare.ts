import * as pulumi from '@pulumi/pulumi';
import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { NetworkSecurityGroup } from '@pulumi/azure-native/network';
import { RouteTable } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';

export function createCloudflareZTNASubnet(
  virtualNetwork: VirtualNetwork,
  resourceGroup: ResourceGroup,
  cidr: string,
): [subnet: Subnet, nsg: NetworkSecurityGroup, routeTable: RouteTable] {
  // Create a new Cloudflare Zero Trust Network subnet
  const subnet = new Subnet('cloudflare-ztna-gateway', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: cidr,
  });
  const routeTable = new RouteTable('cloudflare-ztna-route-table', {
    resourceGroupName: resourceGroup.name,
    routes: [],
  });
  const nsg = new NetworkSecurityGroup('cloudflare-ztna-nsg', {
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
