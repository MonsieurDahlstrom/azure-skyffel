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
exports.gateway = exports.chart = void 0;
exports.setup = setup;
const k8s = __importStar(require('@pulumi/kubernetes'));
const kubernetes = __importStar(require('@pulumi/kubernetes'));
const traefikVersion = '3.3.4';
const traefikHelmVersion = '34.4.0';
function setup(input) {
  const ns = new kubernetes.core.v1.Namespace(
    'traefik',
    {
      metadata: {
        name: 'traefik',
      },
    },
    { provider: input.provider },
  );
  exports.chart = new k8s.helm.v3.Chart(
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
  exports.gateway = new kubernetes.apiextensions.CustomResource(
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
//# sourceMappingURL=traefik-gateway.js.map
