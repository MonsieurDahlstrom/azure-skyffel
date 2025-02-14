import {
  ManagedCluster,
  OSDiskType,
  ListManagedClusterAdminCredentialsResult,
} from '@pulumi/azure-native/containerservice';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import * as pulumi from '@pulumi/pulumi';
export type AksInput = {
  name: string;
  resourceGroup: ResourceGroup;
  networkId: string;
  nodesId: string;
  defaultNode: {
    min: number;
    max: number;
    vmSize: string;
    zones: string[];
    diskSize: number;
    osDiskType: OSDiskType;
  };
  privateDnsZoneId: string;
  subscriptionId: string;
};
export declare let cluster: ManagedCluster;
export declare let clusterIdentity: UserAssignedIdentity;
export declare let adminCredentials: pulumi.Output<ListManagedClusterAdminCredentialsResult>;
export declare function setup(input: AksInput): Promise<boolean>;
//# sourceMappingURL=managed-cluster.d.ts.map
