import * as pulumi from '@pulumi/pulumi';
export type RegisterKubernetesSecretEngineArgs = {
    kubeconfig: pulumi.Input<string>;
    fqdn: pulumi.Input<string>;
    vaultChartVersion?: pulumi.Input<string>;
};
export declare let token: pulumi.Output<string>;
export declare function setup(args: RegisterKubernetesSecretEngineArgs): Promise<boolean>;
//# sourceMappingURL=kubernetes-vault-setup.d.ts.map