'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.identity = exports.helmChart = void 0;
exports.setup = setup;
const kubernetes = __importStar(require('@pulumi/kubernetes'));
const pulumi = __importStar(require('@pulumi/pulumi'));
const azure_native = __importStar(require('@pulumi/azure-native'));
const AzureRoles = __importStar(require('../rbac/roles'));
function setup(input) {
  exports.identity = new azure_native.managedidentity.UserAssignedIdentity(
    `identity-external-dns`,
    {
      resourceGroupName: input.resourceGroupName,
    },
  );
  const roles = [];
  exports.identity.principalId.apply((principalId) => {
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
          (oidcIssuerProfile) => oidcIssuerProfile.issuerURL,
        ),
        resourceGroupName: input.resourceGroupName,
        resourceName: exports.identity.name,
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
          'azure.workload.identity/client-id': exports.identity.clientId,
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
  const azureCredentials = pulumi.interpolate`{ "tenantId": "${input.tenantId}", "subscriptionId": "${input.subscriptionId}", "resourceGroup":"${input.zonesResourceGroupName}", "useWorkloadIdentityExtension": true}`;
  const secret = new kubernetes.core.v1.Secret(
    'external-dns-secret',
    {
      metadata: {
        name: 'external-dns-azure',
        namespace: ns.metadata.name,
      },
      data: {
        'azure.json': azureCredentials.apply((res) =>
          Buffer.from(res).toString('base64'),
        ),
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
                  '--source=gateway-httproute',
                  '--provider=azure-private-dns',
                  ...input.zones.map((zone) => `--domain-filter=${zone.name}`),
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
//# sourceMappingURL=external-dns.js.map
