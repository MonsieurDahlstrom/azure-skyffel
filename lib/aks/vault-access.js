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
exports.setupVaultAccess = setupVaultAccess;
const k8s = __importStar(require('@pulumi/kubernetes'));
/*
https://www.hashicorp.com/blog/how-to-connect-to-kubernetes-clusters-using-boundary
https://developer.hashicorp.com/vault/docs/secrets/kubernetes
*/
function setupVaultAccess(clusterConfig) {
  const k8sProvider = new k8s.Provider('k8s-provider', {
    kubeconfig: clusterConfig,
  });
  const namespace = new k8s.core.v1.Namespace(
    'vault',
    {
      metadata: {
        name: 'vault',
      },
    },
    { provider: k8sProvider },
  );
  const vaultServiceAccount = new k8s.core.v1.ServiceAccount(
    'vault',
    {
      metadata: {
        name: 'vault',
        namespace: namespace.metadata.name,
      },
    },
    { provider: k8sProvider },
  );
  const vaultRole = new k8s.rbac.v1.ClusterRole(
    'vault',
    {
      metadata: {
        name: 'vault',
      },
      rules: [
        {
          apiGroups: [''],
          resources: ['namespaces'],
          verbs: ['get'],
        },
        {
          apiGroups: [''],
          resources: ['serviceaccounts', ' serviceaccounts/token'],
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
    { provider: k8sProvider },
  );
  const vaultRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(
    'vault',
    {
      metadata: {
        name: 'vault-token-creator-binding',
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: vaultRole.metadata.name,
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: vaultServiceAccount.metadata.name,
          namespace: vaultServiceAccount.metadata.namespace,
        },
      ],
    },
    { provider: k8sProvider },
  );
  return {
    serviceAccount: vaultServiceAccount.metadata.name,
    namespace: namespace.metadata.name,
  };
}
//# sourceMappingURL=vault-access.js.map
