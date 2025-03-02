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
        federatedIdentityCredentialResourceName: exports.identity.name,
        issuer: input.cluster.oidcIssuerProfile.apply(
          (oidcIssuerProfile) => oidcIssuerProfile.issuerURL,
        ),
        resourceGroupName: input.resourceGroupName,
        resourceName: input.cluster.name,
        subject: 'system:serviceaccount:external-dns:external-dns',
      },
      { dependsOn: roles },
    );
  // create a provider
  const adminCredentials =
    azure_native.containerservice.listManagedClusterAdminCredentialsOutput({
      resourceGroupName: input.resourceGroupName,
      resourceName: input.cluster.name,
    });
  const provider = new kubernetes.Provider('provider', {
    kubeconfig: adminCredentials.apply((credentials) =>
      Buffer.from(credentials.kubeconfigs[0].value, 'base64').toString(),
    ),
    enableServerSideApply: true,
  });
  // create namespace
  const ns = new kubernetes.core.v1.Namespace(
    'external-dns',
    {
      metadata: {
        name: 'external-dns',
      },
    },
    { provider, dependsOn: [federatedIdentityCredential] },
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
    { provider },
  );
}
//# sourceMappingURL=external-dns.js.map
