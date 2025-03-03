import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export let chart: k8s.helm.v3.Chart;

export type TraefikGatewayArgs = {
  version?: string;
  cluster: azure_native.containerservice.ManagedCluster;
  resourceGroupName: string | pulumi.Output<string>;
};
export function setup(input: TraefikGatewayArgs): void {
  // create a provider
  const adminCredentials =
    azure_native.containerservice.listManagedClusterAdminCredentialsOutput({
      resourceGroupName: input.resourceGroupName,
      resourceName: input.cluster.name,
    });
  const provider = new kubernetes.Provider('provider', {
    kubeconfig: adminCredentials.apply((credentials) =>
      Buffer.from(credentials.kubeconfigs[0]!.value, 'base64').toString(),
    ),
    enableServerSideApply: true,
  });
  const ns = new kubernetes.core.v1.Namespace(
    'traefik',
    {
      metadata: {
        name: 'traefik',
      },
    },
    { provider },
  );
  chart = new k8s.helm.v3.Chart(
    'traefik',
    {
      repo: 'traefik',
      chart: 'traefik',
      version: input.version ? input.version : '34.4.0',
      namespace: ns.metadata.name,
      fetchOpts: {
        repo: 'https://traefik.github.io/charts',
      },
      values: {
        experimental: {
          kubernetesGateway: {
            enabled: true,
          },
        },
      },
    },
    { provider },
  );
}
