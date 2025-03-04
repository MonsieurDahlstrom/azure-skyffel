import * as k8s from '@pulumi/kubernetes';
export type KyvernoArgs = {
  provider: k8s.Provider;
  kyvernoHelmVersion?: string;
  policiesHelmVersion?: string;
};
export declare let kyverno: k8s.helm.v3.Chart;
export declare let policies: k8s.helm.v3.Chart;
export declare function setup(input: KyvernoArgs): Promise<void>;
//# sourceMappingURL=kyverno.d.ts.map
