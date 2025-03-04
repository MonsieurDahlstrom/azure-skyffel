import * as kubernetes from '@pulumi/kubernetes';
export declare let chart: kubernetes.helm.v3.Chart;
export type CrossPlaneArgs = {
  crossplaneHelmVersion?: string;
  provider: kubernetes.Provider;
};
export declare function setup(input: CrossPlaneArgs): void;
//# sourceMappingURL=crossplane.d.ts.map
