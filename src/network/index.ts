import * as azure from '@pulumi/azure-native';

export function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
): azure.network.VirtualNetwork {
  const vnet = new azure.network.VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
  });
  return vnet;
}

export function createSnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet> {
  const subnets = new Map<string, azure.network.Subnet>();
  for (const [key, value] of snets) {
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
