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
import { UpdateResource } from '@ediri/azapi';

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
  privateDnsZoneId?: string | pulumi.Output<string>;
  subscriptionId: string;
  kubernetes_version?: string;
  tags?: { [key: string]: string };
};

export let cluster: ManagedCluster;
export let clusterIdentity: UserAssignedIdentity;
export let adminCredentials: pulumi.Output<ListManagedClusterAdminCredentialsResult>;
export let acns: UpdateResource;

export async function setup(input: AksInput): Promise<boolean> {
  //create an entra identity for the cluster
  clusterIdentity = new UserAssignedIdentity(`identity-${input.name}`, {
    resourceGroupName: input.resourceGroup.name,
  });
  const neededRoles = pulumi
    .all([clusterIdentity.principalId])
    .apply(([principalId]) => {
      let roles = [];
      if (input.networkId) {
        roles.push(grantNetworkAccessToIdentity(principalId!, input));
      }
      if (input.privateDnsZoneId) {
        roles.push(grantDNSContributorToIdentity(principalId!, input));
      }
      return roles;
    });
  // Create the AKS cluster
  cluster = new ManagedCluster(
    input.name,
    {
      agentPoolProfiles: [
        {
          availabilityZones: input.defaultNode.zones,
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
        },
      ],
      apiServerAccessProfile: {
        disableRunCommand: false,
        enablePrivateCluster: true,
        enablePrivateClusterPublicFQDN: true,
        privateDNSZone: input.privateDnsZoneId ?? 'system',
      },
      autoScalerProfile: {
        scaleDownDelayAfterAdd: '15m',
        scanInterval: '30s',
      },
      autoUpgradeProfile: {
        upgradeChannel: UpgradeChannel.Node_image,
      },
      dnsPrefix: input.name,
      enableRBAC: true,
      identity: {
        type: ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [clusterIdentity.id],
      },
      kubernetesVersion: input.kubernetes_version ?? '1.31',
      networkProfile: {
        dnsServiceIP: '172.16.0.10',
        networkDataplane: NetworkDataplane.Cilium,
        networkPlugin: NetworkPlugin.Azure,
        networkPluginMode: NetworkPluginMode.Overlay,
        podCidr: '172.16.4.0/22',
        serviceCidr: '172.16.0.0/24',
      },
      oidcIssuerProfile: {
        enabled: true,
      },
      publicNetworkAccess: 'Disabled',
      resourceGroupName: input.resourceGroup.name,
      securityProfile: {
        imageCleaner: {
          enabled: true,
          intervalHours: 24,
        },
        workloadIdentity: {
          enabled: true,
        },
      },
      tags: input.tags,
    },
    { dependsOn: neededRoles },
  );
  adminCredentials = listManagedClusterAdminCredentialsOutput({
    resourceGroupName: input.resourceGroup.name,
    resourceName: cluster.name,
  });
  acns = new UpdateResource(`${input.name}-acns`, {
    resourceId: cluster.id.apply((id) => id.toLowerCase()),
    type: 'Microsoft.ContainerService/managedClusters@2024-10-01',
    body: JSON.stringify({
      properties: {
        networkProfile: {
          advancedNetworking: {
            enabled: true,
          },
        },
      },
    }),
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
      scope: input.privateDnsZoneId!,
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
      scope: input.privateDnsZoneId!,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  }
}
