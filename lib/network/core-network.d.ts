import * as azure from '@pulumi/azure-native';
export declare enum Delegation {
  None = 0,
  GithubRunner = 1,
  PrivateDNSResovler = 2,
}
export interface Layout {
  name: string;
  resourceGroup: azure.resources.ResourceGroup;
  layout: {
    cidr: string;
    dnsServers?: string[];
    subnets: {
      name: string;
      cidr: string;
      delegationType: string | Delegation;
    }[];
  };
}
export interface SubnetArgs extends azure.network.SubnetArgs {
  delegationType?: Delegation;
}
export declare let virtualNetwork: azure.network.VirtualNetwork | undefined;
export declare let subnets: Map<string, azure.network.Subnet>;
export declare function setup(input: Layout): Promise<void>;
export declare function setupNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
  dnsServers?: string[],
): void;
export declare function setupSubnets(snets: Map<string, SubnetArgs>): void;
export declare function reset(): void;
//# sourceMappingURL=core-network.d.ts.map
