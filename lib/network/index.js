import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export function createNetwork(resourceGroup, name, cidr) {
  const vnet = new VirtualNetwork(name, {
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
    const subnet = new Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
//# sourceMappingURL=index.js.map
