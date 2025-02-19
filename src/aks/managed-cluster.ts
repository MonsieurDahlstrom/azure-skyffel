import {
  ManagedCluster,
  UpgradeChannel,
  ResourceIdentityType,
  NetworkDataplane,
  NetworkPlugin,
  NetworkPluginMode,
  OSDiskType,
  listManagedClusterAdminCredentialsOutput,
  ListManagedClusterAdminCredentialsResult,
} from '@pulumi/azure-native/containerservice';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { RoleAssignment } from '@pulumi/azure-native/authorization';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import {
  Subnet,
  VirtualNetwork,
  PrivateZone,
} from '@pulumi/azure-native/network';
import * as AzureRoles from '../rbac/roles';
import * as pulumi from '@pulumi/pulumi';
import { parse } from 'yaml';

export type AksInput = {
  name: string;
  resourceGroup: ResourceGroup;
  networkId: string | pulumi.Output<string>;
  nodesId: string | pulumi.Output<string>;
  defaultNode: {
    min: number;
    max: number;
    vmSize: string;
    zones: string[];
    diskSize: number;
    osDiskType: OSDiskType;
  };
  privateDnsZoneId: string | pulumi.Output<string>;
  subscriptionId: string;
  // TODO: tags commonTags?: { [key: string]: string };
};

export let cluster: ManagedCluster;
export let clusterIdentity: UserAssignedIdentity;
export let adminCredentials: pulumi.Output<ListManagedClusterAdminCredentialsResult>;

export async function setup(input: AksInput): Promise<boolean> {
  //create an entra identity for the cluster
  clusterIdentity = new UserAssignedIdentity(`identity-${input.name}`, {
    resourceGroupName: input.resourceGroup.name,
  });

  const neededRoles = pulumi
    .all([clusterIdentity.principalId])
    .apply(([principalId]) => {
      let networkRole: RoleAssignment | pulumi.Output<RoleAssignment> =
        grantNetworkAccessToIdentity(principalId!, input);
      let privateDnsRole: RoleAssignment | pulumi.Output<RoleAssignment> =
        grantDNSContributorToIdentity(principalId!, input);
      return [networkRole, privateDnsRole];
    });
  // Create the AKS cluster
  cluster = new ManagedCluster(
    input.name,
    {
      resourceGroupName: input.resourceGroup.name,
      identity: {
        type: ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [clusterIdentity.id],
      },
      networkProfile: {
        networkDataplane: NetworkDataplane.Cilium,
        networkPlugin: NetworkPlugin.Azure,
        networkPluginMode: NetworkPluginMode.Overlay,
        podCidr: '172.16.4.0/22',
        serviceCidr: '172.16.0.0/24',
        dnsServiceIP: '172.16.0.10',
      },
      agentPoolProfiles: [
        {
          count: input.defaultNode.min,
          maxPods: 110,
          mode: 'System',
          name: 'agentpool',
          nodeLabels: {},
          osDiskSizeGB: input.defaultNode.diskSize,
          osDiskType: input.defaultNode.osDiskType,
          osType: 'Linux',
          type: 'VirtualMachineScaleSets',
          vmSize: input.defaultNode.vmSize,
          vnetSubnetID: input.nodesId,
          availabilityZones: input.defaultNode.zones,
        },
      ],
      apiServerAccessProfile: {
        enablePrivateCluster: true,
        enablePrivateClusterPublicFQDN: true,
        disableRunCommand: false,
        privateDNSZone: input.privateDnsZoneId,
      },
      autoScalerProfile: {
        scaleDownDelayAfterAdd: '15m',
        scanInterval: '30s',
      },
      dnsPrefix: input.name,
      enableRBAC: true,
      kubernetesVersion: '1.31',
      publicNetworkAccess: 'Disabled',
      autoUpgradeProfile: {
        upgradeChannel: UpgradeChannel.Node_image,
      },
    },
    { dependsOn: neededRoles },
  );
  adminCredentials = listManagedClusterAdminCredentialsOutput({
    resourceGroupName: input.resourceGroup.name,
    resourceName: cluster.name,
  });
  return true;
}

function grantNetworkAccessToIdentity(
  principalId: string,
  input: AksInput,
): RoleAssignment | pulumi.Output<RoleAssignment> {
  if (typeof input.networkId === 'string') {
    return AzureRoles.assignRole({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.NetworkContributor,
      scope: input.networkId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  } else {
    return AzureRoles.assignRoleOutput({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.NetworkContributor,
      scope: input.networkId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  }
}

function grantDNSContributorToIdentity(
  principalId: string,
  input: AksInput,
): RoleAssignment | pulumi.Output<RoleAssignment> {
  if (typeof input.privateDnsZoneId === 'string') {
    return AzureRoles.assignRole({
      principal: {
        id: principalId!,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
      scope: input.privateDnsZoneId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  } else {
    return AzureRoles.assignRoleOutput({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
      scope: input.privateDnsZoneId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  }
}
