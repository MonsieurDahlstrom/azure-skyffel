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
  version?: string;
  cluster: azure_native.containerservice.ManagedCluster;
  provider: kubernetes.Provider;
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
        issuer: input.cluster.oidcIssuerProfile.apply(
          (oidcIssuerProfile) => oidcIssuerProfile!.issuerURL,
        ),
        resourceGroupName: input.resourceGroupName,
        resourceName: identity.name,
        subject: 'system:serviceaccount:external-dns:external-dns',
      },
      { dependsOn: roles },
    );
  // create namespace
  const ns = new kubernetes.core.v1.Namespace(
    'external-dns',
    {
      metadata: {
        name: 'external-dns',
      },
    },
    { provider: input.provider, dependsOn: [federatedIdentityCredential] },
  );
  // create service account
  const sa = new kubernetes.core.v1.ServiceAccount(
    'external-dns',
    {
      metadata: {
        name: 'external-dns',
        namespace: ns.metadata.name,
        annotations: {
          'azure.workload.identity/client-id': identity.clientId,
          'azure.workload.identity/tenant-id': input.tenantId,
        },
      },
    },
    { provider: input.provider },
  );
  const role = new kubernetes.rbac.v1.ClusterRole(
    'external-dns-cluster-role',
    {
      metadata: {
        name: 'external-dns',
      },
      rules: [
        {
          apiGroups: [''],
          resources: ['services', 'endpoints', 'pods', 'namespaces'],
          verbs: ['get', 'watch', 'list'],
        },
        {
          apiGroups: ['networking', 'networking.k8s.io'],
          resources: ['ingresses'], // for ingress
          verbs: ['get', 'watch', 'list'],
        },
        {
          apiGroups: [''],
          resources: ['nodes'],
          verbs: ['get', 'watch', 'list'],
        },
        {
          apiGroups: ['gateway.networking.k8s.io'],
          resources: [
            'gateways',
            'httproutes',
            'grpcroutes',
            'tlsroutes',
            'tcproutes',
            'udproutes',
          ],
          verbs: ['get', 'watch', 'list'],
        },
      ],
    },
    { provider: input.provider },
  );

  const roleBinding = new kubernetes.rbac.v1.ClusterRoleBinding(
    'external-dns-cluster-role-binding',
    {
      metadata: {
        name: 'external-dns',
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: role.metadata.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: sa.metadata.name,
          namespace: sa.metadata.namespace,
        },
      ],
    },
    { provider: input.provider },
  );

  const azureCredentials = JSON.stringify({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    resourceGroup: input.resourceGroupName,
    useWorkloadIdentityExtension: true,
  });

  const secret = new kubernetes.core.v1.Secret(
    'external-dns-secret',
    {
      metadata: {
        name: 'external-dns-azure',
        namespace: ns.metadata.name,
      },
      data: {
        'azure.json': Buffer.from(azureCredentials).toString('base64'),
      },
    },
    { provider: input.provider },
  );

  const deployment = new kubernetes.apps.v1.Deployment(
    'external-dns',
    {
      metadata: {
        name: 'external-dns',
        namespace: ns.metadata.name,
      },
      spec: {
        selector: {
          matchLabels: { app: 'externaldns' },
        },
        strategy: {
          type: 'Recreate',
        },
        template: {
          metadata: {
            labels: {
              app: 'externaldns',
              'azure.workload.identity/use': 'true',
            },
          },
          spec: {
            serviceAccountName: sa.metadata.name,
            containers: [
              {
                name: 'external-dns',
                image: `k8s.gcr.io/external-dns/external-dns:v${input.version ? input.version : '0.15.1'}`,
                args: [
                  '--source=service',
                  '--source=ingress',
                  '--source=gateway-httproute',
                  '--provider=azure-private-dns',
                ],
                volumeMounts: [
                  {
                    name: 'azure-config-file',
                    mountPath: '/etc/kubernetes',
                    readOnly: true,
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'azure-config-file',
                secret: {
                  secretName: secret.metadata.name,
                },
              },
            ],
          },
        },
      },
    },
    { provider: input.provider },
  );
}
