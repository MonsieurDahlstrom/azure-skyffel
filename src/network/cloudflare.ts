import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';

export function createCloudflareZTNASubnet(
  virtualNetwork: azure.network.VirtualNetwork,
  resourceGroup: azure.resources.ResourceGroup,
  cidr: string,
): [
  subnet: azure.network.Subnet,
  nsg: azure.network.NetworkSecurityGroup,
  routeTable: azure.network.RouteTable,
] {
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
