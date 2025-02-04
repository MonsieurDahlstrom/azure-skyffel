import * as pulumi from '@pulumi/pulumi';
export declare function setupVaultAccess(
  clusterConfig: pulumi.Output<string>,
): {
  serviceAccount: pulumi.Output<string>;
  namespace: pulumi.Output<string>;
};
//# sourceMappingURL=vault-access.d.ts.map
