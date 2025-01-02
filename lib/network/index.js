import * as azure from '@pulumi/azure-native';

export function createNetwork(resourceGroup, name, cidr) {
  const vnet = new azure.network.VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
  });
  return vnet;
}
export function createSnets(snets) {
  const subnets = new Map();
  for (const [key, value] of snets) {
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
//# sourceMappingURL=index.js.map
