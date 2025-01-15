import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { NetworkSecurityGroup } from '@pulumi/azure-native/network';
import { RouteTable } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare function createCloudflareZTNASubnet(
  virtualNetwork: VirtualNetwork,
  resourceGroup: ResourceGroup,
  cidr: string,
): [subnet: Subnet, nsg: NetworkSecurityGroup, routeTable: RouteTable];
//# sourceMappingURL=cloudflare.d.ts.map
