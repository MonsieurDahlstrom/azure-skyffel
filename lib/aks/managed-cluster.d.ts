import {
  ManagedCluster,
  OSDiskType,
  ListManagedClusterAdminCredentialsResult,
} from '@pulumi/azure-native/containerservice';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import {
  Subnet,
  VirtualNetwork,
  PrivateZone,
} from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';
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
export declare let adminCredentials: pulumi.Output<ListManagedClusterAdminCredentialsResult>;
export declare function setup(input: AksInput): Promise<boolean>;
//# sourceMappingURL=managed-cluster.d.ts.map
