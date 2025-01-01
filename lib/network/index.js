'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.createNetwork = createNetwork;
exports.createSnets = createSnets;
/*
import {
  VirtualNetwork,
  Subnet,
  type SubnetArgs,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
*/
const azure_native_1 = __importDefault(require('@pulumi/azure-native'));
function createNetwork(resourceGroup, name, cidr) {
  const vnet = new azure_native_1.default.network.VirtualNetwork(name, {
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
    const subnet = new azure_native_1.default.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}
//# sourceMappingURL=index.js.map
