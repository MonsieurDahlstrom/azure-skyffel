'use strict';
/*
import {
  VirtualNetwork,
  Subnet,
  type SubnetArgs,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
*/
const azure = require('@pulumi/azure-native');
function createNetwork(resourceGroup, name, cidr) {
  const vnet = new azure.network.VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
  });
  return vnet;
}
function createSnets(snets) {
  const subnets = new Map();
  for (const [key, value] of snets) {
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
module.exports = { createNetwork, createSnets };
//# sourceMappingURL=index.cjs.map
