import {
  ManagedCluster,
  OSDiskType,
} from '@pulumi/azure-native/containerservice';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import {
  Subnet,
  VirtualNetwork,
  PrivateZone,
} from '@pulumi/azure-native/network';
export type AksInput = {
  name: string;
  resourceGroup: ResourceGroup;
  network: VirtualNetwork;
  nodes: Subnet;
  defaultNode: {
    min: number;
    max: number;
    vmSize: string;
    zones: string[];
    diskSize: number;
    osDiskType: OSDiskType;
  };
  privateDnsZone: PrivateZone;
  subscriptionId: string;
};
export declare let cluster: ManagedCluster;
export declare let clusterIdentity: UserAssignedIdentity;
export declare let clusterKubeconfig: any;
export declare function setupAKS(input: AksInput): Promise<boolean>;
//# sourceMappingURL=managed-cluster.d.ts.map
