import * as pulumi from '@pulumi/pulumi';
export type RegisterKubernetesSecretEngineArgs = {
  kubeConfig: pulumi.Input<string>;
  vault: {
    fqdn: pulumi.Input<string>;
    chartVersion?: pulumi.Input<string>;
  };
};
export declare function setupKubernetesSecretEngine(
  args: RegisterKubernetesSecretEngineArgs,
): Promise<boolean>;
//# sourceMappingURL=kubernetes-secret-engine.d.ts.map
