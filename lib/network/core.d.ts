import * as azure from '@pulumi/azure-native';
export declare function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
  dnsServers?: string[],
): azure.network.VirtualNetwork;
export declare enum MDSubbnetDelegation {
  None = 0,
  GithubRunner = 1,
  PrivateDNSResovler = 2,
}
export interface MDSubnetArgs extends azure.network.SubnetArgs {
  delegationType?: MDSubbnetDelegation;
}
export declare function createSubnets(
  snets: Map<string, MDSubnetArgs>,
): Map<string, azure.network.Subnet>;
export declare function cidrSubnet(
  iprange: string,
  newbits: number,
  netnum: number,
): string;
export declare function cidrHost(iprange: string, hostnum: number): string;
//# sourceMappingURL=core.d.ts.map
