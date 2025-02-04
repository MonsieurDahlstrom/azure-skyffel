import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

/*
https://www.hashicorp.com/blog/how-to-connect-to-kubernetes-clusters-using-boundary
https://developer.hashicorp.com/vault/docs/secrets/kubernetes
*/
export function setupVaultAccess(clusterConfig: pulumi.Output<string>): {
  serviceAccount: pulumi.Output<string>;
  namespace: pulumi.Output<string>;
} {
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
