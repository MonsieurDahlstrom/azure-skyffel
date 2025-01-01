import * as azure from '@pulumi/azure-native';
export declare function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
): azure.network.VirtualNetwork;
export declare function createSnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet>;
//# sourceMappingURL=index.d.ts.map
