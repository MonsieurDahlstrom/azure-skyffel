import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

import * as AzureRoles from '../rbac/roles';
export let helmChart: kubernetes.helm.v3.Chart;
export let identity: azure_native.managedidentity.UserAssignedIdentity;

export type ExternalDnsArgs = {
  resourceGroupName: string | pulumi.Output<string>;
  tenantId: string;
  subscriptionId: string;
  zones: (
    | azure_native.network.GetPrivateZoneResult
    | azure_native.network.PrivateZone
  )[];
  cluster: azure_native.containerservice.ManagedCluster;
};

export function setup(input: ExternalDnsArgs): void {
  identity = new azure_native.managedidentity.UserAssignedIdentity(
    `identity-external-dns`,
    {
      resourceGroupName: input.resourceGroupName,
    },
  );
  const roles: (
    | pulumi.Output<azure_native.authorization.RoleAssignment>
    | azure_native.authorization.RoleAssignment
  )[] = [];
  identity.principalId.apply((principalId) => {
    input.zones.map((zone) => {
      if (typeof zone.id === 'string') {
        roles.push(
          AzureRoles.assignRole({
            principal: {
              id: principalId,
              type: 'ServicePrincipal',
            },
            rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
            scope: zone.id,
            key: 'external-dns',
            subscriptionId: input.subscriptionId,
          }),
        );
      } else {
        roles.push(
          AzureRoles.assignRoleOutput({
            principal: {
              id: principalId,
              type: 'ServicePrincipal',
            },
            rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
            scope: zone.id,
            key: 'external-dns',
            subscriptionId: input.subscriptionId,
          }),
        );
      }
    });
  });
  // federated credential to use workload identity
  const federatedIdentityCredential =
    new azure_native.managedidentity.FederatedIdentityCredential(
      'federatedIdentityCredential',
      {
        audiences: ['api://AzureADTokenExchange'],
        federatedIdentityCredentialResourceName: identity.name,
        issuer: input.cluster.oidcIssuerProfile.apply(
          (oidcIssuerProfile) => oidcIssuerProfile!.issuerURL,
        ),
        resourceGroupName: input.resourceGroupName,
        resourceName: input.cluster.name,
        subject: 'system:serviceaccount:external-dns:external-dns',
      },
      { dependsOn: roles },
    );
  // create namespace
  const ns = new kubernetes.core.v1.Namespace('external-dns', {
    metadata: {
      name: 'external-dns',
    },
  });
  // create service account
  const sa = new kubernetes.core.v1.ServiceAccount('external-dns', {
    metadata: {
      name: 'external-dns',
      namespace: ns.metadata.name,
      annotations: {
        'azure.workload.identity/client-id': identity.clientId,
        'azure.workload.identity/tenant-id': input.tenantId,
      },
    },
  });
}
