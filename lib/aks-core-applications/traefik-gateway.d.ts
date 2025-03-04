import * as pulumi from '@pulumi/pulumi';
import * as kubernetes from '@pulumi/kubernetes';
export declare let chart: kubernetes.helm.v3.Chart;
export declare let gateway: kubernetes.apiextensions.CustomResource;
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
export declare function setup(input: TraefikGatewayArgs): void;
//# sourceMappingURL=traefik-gateway.d.ts.map
