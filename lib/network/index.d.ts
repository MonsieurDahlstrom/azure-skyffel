import * as azure from '@pulumi/azure-native';
export declare function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
): azure.network.VirtualNetwork;
export declare function createSubnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet>;
export declare function cidrSubnet(
  iprange: string,
  newbits: number,
  netnum: number,
): string;
export declare function cidrHost(iprange: string, hostnum: number): string;
//# sourceMappingURL=index.d.ts.map
