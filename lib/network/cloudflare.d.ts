import * as azure from '@pulumi/azure-native';
export declare function createCloudflareZTNASubnet(
  virtualNetwork: azure.network.VirtualNetwork,
  resourceGroup: azure.resources.ResourceGroup,
  cidr: string,
): [
  subnet: azure.network.Subnet,
  nsg: azure.network.NetworkSecurityGroup,
  routeTable: azure.network.RouteTable,
];
//# sourceMappingURL=cloudflare.d.ts.map
