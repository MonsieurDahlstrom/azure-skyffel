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
exports.setupKubernetesSecretEngine = setupKubernetesSecretEngine;
const kubernetes = __importStar(require('@pulumi/kubernetes'));
async function setupKubernetesSecretEngine(args) {
  const aksProvider = new kubernetes.Provider('aks', {
    kubeconfig: args.kubeConfig,
  });
  const vaultHelmChart = new kubernetes.helm.v3.Chart(
    'vault',
    {
      repo: 'hashicorp',
      chart: 'vault',
      version: args.vault.chartVersion ? args.vault.chartVersion : undefined,
      fetchOpts: {
        repo: 'https://helm.releases.hashicorp.com',
      },
      namespace: 'vault',
      values: {
        global: {
          externalVaultAddr: `https://${args.vault.fqdn}:8200`,
        },
      },
    },
    { provider: aksProvider },
  );
  const secret = new kubernetes.core.v1.Secret(
    'vault-token',
    {
      metadata: {
        name: 'vault-token',
        namespace: 'vault',
        annotations: {
          'kubernetes.io/service-account.name': 'vault',
        },
      },
      type: 'kubernetes.io/service-account-token',
    },
    { dependsOn: vaultHelmChart, provider: aksProvider },
  );
  const clusterrole = new kubernetes.rbac.v1.ClusterRole(
    'vault-cluster-admin',
    {
      rules: [
        {
          apiGroups: [''],
          resources: ['namespaces'],
          verbs: ['get'],
        },
        {
          apiGroups: [''],
          resources: ['serviceaccounts', 'serviceaccounts/token'],
          verbs: ['create', 'update', 'delete'],
        },
        {
          apiGroups: ['rbac.authorization.k8s.io'],
          resources: ['rolebindings', 'clusterrolebindings'],
          verbs: ['create', 'update', 'delete'],
        },
        {
          apiGroups: ['rbac.authorization.k8s.io'],
          resources: ['roles', 'clusterroles'],
          verbs: ['bind', 'escalate', 'create', 'update', 'delete'],
        },
      ],
    },
    { provider: aksProvider },
  );
  const clusterrolebinding = new kubernetes.rbac.v1.ClusterRoleBinding(
    'vault',
    {
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: clusterrole.metadata.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: 'vault',
          namespace: 'vault',
        },
      ],
    },
    { dependsOn: [clusterrole, vaultHelmChart], provider: aksProvider },
  );
  return true;
}
//# sourceMappingURL=kubernetes-secret-engine.js.map
