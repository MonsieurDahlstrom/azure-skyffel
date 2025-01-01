import * as azure from '@pulumi/azure-native';

export type AksInput = {
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
  commonTags?: { [key: string]: string };
};

export function createAks(input: AksInput) {
  // Create AKS cluster
}
