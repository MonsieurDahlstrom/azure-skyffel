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
exports.token = void 0;
exports.setup = setup;
const kubernetes = __importStar(require('@pulumi/kubernetes'));
async function setup(args) {
  const vaultURL = `https://${args.fqdn}:8200`;
  const aksProvider = new kubernetes.Provider('aks', {
    kubeconfig: args.kubeconfig,
  });
  const vaultHelmChart = new kubernetes.helm.v3.Release(
    'vault',
    {
      chart: 'vault',
      name: 'vault',
      createNamespace: true,
      version: args.vaultChartVersion ? args.vaultChartVersion : undefined,
      repositoryOpts: {
        repo: 'https://helm.releases.hashicorp.com',
      },
      namespace: 'vault',
      values: {
        global: {
          externalVaultAddr: vaultURL,
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
      metadata: {
        name: 'k8s-full-secrets-abilities-with-labels',
      },
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
  exports.token = secret.data.token.apply((token) => token);
  return true;
}
//# sourceMappingURL=kubernetes-vault-setup.js.map
