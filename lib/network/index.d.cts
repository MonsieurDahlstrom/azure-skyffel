import azure = require('@pulumi/azure-native');
declare function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
): azure.network.VirtualNetwork;
declare function createSnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet>;
declare const _default: {
  createNetwork: typeof createNetwork;
  createSnets: typeof createSnets;
};
export = _default;
//# sourceMappingURL=index.d.cts.map
