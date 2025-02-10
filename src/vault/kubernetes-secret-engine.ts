import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export type RegisterKubernetesSecretEngineArgs = {
  kubeConfig: pulumi.Input<string>;
  vault: {
    fqdn: pulumi.Input<string>;
    chartVersion?: pulumi.Input<string>;
  };
};

export async function setupKubernetesSecretEngine(
  args: RegisterKubernetesSecretEngineArgs,
): Promise<boolean> {
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
