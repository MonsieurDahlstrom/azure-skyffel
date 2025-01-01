/*
import {
  VirtualNetwork,
  Subnet,
  type SubnetArgs,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
*/
import azure = require('@pulumi/azure-native');

function createNetwork(
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

function createSnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet> {
  const subnets = new Map<string, azure.network.Subnet>();
  for (const [key, value] of snets) {
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}

export = { createNetwork, createSnets };
