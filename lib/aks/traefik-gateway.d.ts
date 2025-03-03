import * as k8s from '@pulumi/kubernetes';
import * as kubernetes from '@pulumi/kubernetes';
export declare let chart: k8s.helm.v3.Chart;
export type TraefikGatewayArgs = {
  version?: string;
  provider: kubernetes.Provider;
};
export declare function setup(input: TraefikGatewayArgs): void;
//# sourceMappingURL=traefik-gateway.d.ts.map
