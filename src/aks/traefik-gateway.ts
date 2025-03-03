import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export let chart: k8s.helm.v3.Chart;

const traefikVersion = '3.3.4';
const traefikHelmVersion = '34.4.0';

export type TraefikGatewayArgs = {
  version?: string;
  traefikVersion?: string;
  provider: kubernetes.Provider;
  loadbalancerSubnetName: string | pulumi.Input<string>;
};
export function setup(input: TraefikGatewayArgs): void {
  const ns = new kubernetes.core.v1.Namespace(
    'traefik',
    {
      metadata: {
        name: 'traefik',
      },
    },
    { provider: input.provider },
  );
  chart = new k8s.helm.v3.Chart(
    'traefik',
    {
      repo: 'traefik',
      chart: 'traefik',
      version: input.version ? input.version : traefikHelmVersion,
      namespace: ns.metadata.name,
      fetchOpts: {
        repo: 'https://traefik.github.io/charts',
      },
      values: {
        deployment: {
          kind: 'DaemonSet',
        },
        service: {
          enabled: true,
          type: 'LoadBalancer',
          annotations: {
            'service.beta.kubernetes.io/azure-load-balancer-internal': 'true',
            'service.beta.kubernetes.io/azure-load-balancer-internal-subnet':
              input.loadbalancerSubnetName,
          },
        },
        image: {
          tag: input.traefikVersion ? input.traefikVersion : traefikVersion,
        },
        gateway: {
          enabled: false,
        },
        providers: {
          kubernetesIngress: {
            enabled: false,
          },
          kubernetesCRD: {
            enabled: false,
          },
          file: {
            enabled: false,
          },
          kubernetesGateway: {
            enabled: true,
            experimentalChannel: true,
          },
        },
      },
    },
    { provider: input.provider },
  );
}
