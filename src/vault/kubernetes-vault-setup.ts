import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export type RegisterKubernetesSecretEngineArgs = {
  kubeconfig: pulumi.Input<string>;
  fqdn: pulumi.Input<string>;
  vaultChartVersion?: pulumi.Input<string>;
};

export let token: pulumi.Output<string>;

export async function setup(
  args: RegisterKubernetesSecretEngineArgs,
): Promise<boolean> {
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
      metadata: {
        name: 'vault-token-creator-binding',
      },
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
  token = secret.data.token!.apply((token) => token);
  return true;
}
