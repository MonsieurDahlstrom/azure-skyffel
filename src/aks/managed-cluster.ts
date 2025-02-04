import {
  ManagedCluster,
  UpgradeChannel,
  ResourceIdentityType,
  NetworkDataplane,
  NetworkPlugin,
  NetworkPluginMode,
  OSDiskType,
  listManagedClusterAdminCredentials,
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
  // TODO: tags commonTags?: { [key: string]: string };
};

export let cluster: ManagedCluster;
export let clusterIdentity: UserAssignedIdentity;
export let clusterKubeconfig: any;
export async function setupAKS(input: AksInput): Promise<boolean> {
  //create an entra identity for the cluster
  clusterIdentity = new UserAssignedIdentity(`identity-${input.name}`, {
    resourceGroupName: input.resourceGroup.name,
  });
  const neededRoles = pulumi
    .all([
      clusterIdentity.principalId,
      input.privateDnsZone.id,
      input.network.id,
    ])
    .apply(([principalId, dnsZoneId, vnetId]): RoleAssignment[] => {
      let roles: RoleAssignment[] = [];
      roles.push(
        AzureRoles.assignRole({
          principal: {
            id: principalId,
            type: 'ServicePrincipal',
          },
          rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
          scope: dnsZoneId,
          key: 'kubernetes',
          subscriptionId: input.subscriptionId,
        }),
      );
      roles.push(
        AzureRoles.assignRole({
          principal: {
            id: principalId,
            type: 'ServicePrincipal',
          },
          rbacRole: AzureRoles.RoleUUID.NetworkContributor,
          scope: vnetId,
          key: 'kubernetes',
          subscriptionId: input.subscriptionId,
        }),
      );
      return roles;
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
          vnetSubnetID: input.nodes.id,
          availabilityZones: input.defaultNode.zones,
        },
      ],
      apiServerAccessProfile: {
        enablePrivateCluster: true,
        enablePrivateClusterPublicFQDN: false,
        disableRunCommand: false,
        privateDNSZone: input.privateDnsZone.id,
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
  clusterKubeconfig = pulumi
    .all([input.resourceGroup.name, cluster.name])
    .apply(async ([resourceGroupName, resourceName]) => {
      const creds = await listManagedClusterAdminCredentials({
        resourceGroupName,
        resourceName,
      });
      return parse(
        Buffer.from(creds.kubeconfigs[0]!.value, 'base64').toString('binary'),
      );
    });
  return true;
}
