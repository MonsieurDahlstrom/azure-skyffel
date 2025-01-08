import * as azure from '@pulumi/azure-native';
export type AksInput = {
  name: string;
  resourceGroup: azure.resources.ResourceGroup;
  vnet: azure.network.VirtualNetwork;
  nodes: azure.network.Subnet;
  pods?: azure.network.Subnet;
  defaultNode: {
    min: number;
    max: number;
    vmSize: string;
    zones: string[];
  };
  privateDnsZone?: azure.network.PrivateZone;
  commonTags?: {
    [key: string]: string;
  };
};
export declare function createAKS(
  input: AksInput,
): azure.containerservice.ManagedCluster;
//# sourceMappingURL=core.d.ts.map
