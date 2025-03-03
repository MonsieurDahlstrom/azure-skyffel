import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export let chart: kubernetes.helm.v3.Chart;
export let gateway: kubernetes.apiextensions.CustomResource;

const traefikVersion = '3.3.4';
const traefikHelmVersion = '34.4.0';

export type TraefikGatewayArgs = {
  version?: string;
  traefikVersion?: string;
  provider: kubernetes.Provider;
  loadbalancerSubnetName: string | pulumi.Output<string>;
  hostname: string;
  tls: {
    certificate: string | pulumi.Output<string>;
    key: string | pulumi.Output<string>;
  };
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
            experimentalChannel: false,
          },
        },
      },
    },
    { provider: input.provider },
  );

  const tlsSecret = new kubernetes.core.v1.Secret(
    'traefik-cert',
    {
      metadata: {
        name: 'traefik-cert',
        namespace: ns.metadata.name,
      },
      type: 'kubernetes.io/tls',
      data: {
        'tls.crt': input.tls.certificate,
        'tls.key': input.tls.key,
      },
    },
    { provider: input.provider },
  );

  gateway = new kubernetes.apiextensions.CustomResource(
    'traefik-gateway',
    {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'Gateway',
      metadata: {
        name: 'traefik-gateway',
        namespace: ns.metadata.name,
      },
      spec: {
        gatewayClassName: 'traefik',
        listeners: [
          {
            name: 'http',
            protocol: 'HTTP',
            port: 8000,
            hostname: input.hostname,
            allowedRoutes: {
              namespaces: {
                from: 'All',
              },
            },
          },
          {
            name: 'https',
            protocol: 'HTTPS',
            port: 8443,
            tls: {
              mode: 'Terminate',
              certificateRefs: [
                {
                  kind: 'Secret',
                  group: '',
                  name: tlsSecret.metadata.name,
                },
              ],
            },
            hostname: input.hostname,
            allowedRoutes: {
              namespaces: {
                from: 'All',
              },
            },
          },
        ],
      },
    },
    { provider: input.provider },
  );
}
