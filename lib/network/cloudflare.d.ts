import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { NetworkSecurityGroup } from '@pulumi/azure-native/network';
import { RouteTable } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare let subnet: Subnet | undefined;
export declare let networkSecurityGroup: NetworkSecurityGroup | undefined;
export declare let routeTable: RouteTable | undefined;
export type CloudflareNetworkInput = {
  resourceGroup: ResourceGroup;
  virtualNetwork: VirtualNetwork;
  subnetCidr: string;
};
export declare function setup(input: CloudflareNetworkInput): Promise<boolean>;
//# sourceMappingURL=cloudflare.d.ts.map
