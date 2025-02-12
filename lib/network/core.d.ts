import * as azure from '@pulumi/azure-native';
export declare let virtualNetwork: azure.network.VirtualNetwork;
export declare let subnets: Map<string, azure.network.Subnet>;
export declare function setupNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
  dnsServers?: string[],
): void;
export declare enum MDSubbnetDelegation {
  None = 0,
  GithubRunner = 1,
  PrivateDNSResovler = 2,
}
export interface MDSubnetArgs extends azure.network.SubnetArgs {
  delegationType?: MDSubbnetDelegation;
}
export declare function setupSubnets(snets: Map<string, MDSubnetArgs>): void;
export declare function cidrSubnet(
  iprange: string,
  newbits: number,
  netnum: number,
): string;
export declare function cidrHost(iprange: string, hostnum: number): string;
//# sourceMappingURL=core.d.ts.map
