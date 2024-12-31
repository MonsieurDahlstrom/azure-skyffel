import {
  VirtualNetwork,
  Subnet,
  type SubnetArgs,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';

export function createNetwork(
  resourceGroup: ResourceGroup,
  name: string,
  cidr: string,
): VirtualNetwork {
  const vnet = new VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
  });
  return vnet;
}

export function createSnets(
  snets: Map<string, SubnetArgs>,
): Map<string, Subnet> {
  const subnets = new Map<string, Subnet>();
  for (const [key, value] of snets) {
    const subnet = new Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
