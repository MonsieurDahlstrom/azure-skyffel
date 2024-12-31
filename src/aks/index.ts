import { ResourceGroup } from '@pulumi/azure-native/resources';
import {
  VirtualNetwork,
  Subnet,
  PrivateZone,
} from '@pulumi/azure-native/network';

export type AksInput = {
  resourceGroup: ResourceGroup;
  vnet: VirtualNetwork;
  nodes: Subnet;
  pods?: Subnet;
  defaultNode: {
    min: string;
    max: string;
    vmSize: string;
    zones: string[];
  };
  privateDnsZone?: PrivateZone;
  commonTags?: { [key: string]: string };
};

export function createAks(input: AksInput) {
  // Create AKS cluster
}
