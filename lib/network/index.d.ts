import {
  VirtualNetwork,
  Subnet,
  type SubnetArgs,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare function createNetwork(
  resourceGroup: ResourceGroup,
  name: string,
  cidr: string,
): VirtualNetwork;
export declare function createSnets(
  snets: Map<string, SubnetArgs>,
): Map<string, Subnet>;
//# sourceMappingURL=index.d.ts.map
