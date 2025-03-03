import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export declare let chart: k8s.helm.v3.Chart;
export type TraefikGatewayArgs = {
  version?: string;
  cluster: azure_native.containerservice.ManagedCluster;
  resourceGroupName: string | pulumi.Output<string>;
};
export declare function setup(input: TraefikGatewayArgs): void;
//# sourceMappingURL=traefik-gateway.d.ts.map
