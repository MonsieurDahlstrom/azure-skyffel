import azure = require('@pulumi/azure-native');
type AksInput = {
  resourceGroup: azure.resources.ResourceGroup;
  vnet: azure.network.VirtualNetwork;
  nodes: azure.network.Subnet;
  pods?: azure.network.Subnet;
  defaultNode: {
    min: string;
    max: string;
    vmSize: string;
    zones: string[];
  };
  privateDnsZone?: azure.network.PrivateZone;
  commonTags?: {
    [key: string]: string;
  };
};
declare function createAks(input: AksInput): void;
declare const _default: {
  createAks: typeof createAks;
};
export = _default;
//# sourceMappingURL=index.d.cts.map
