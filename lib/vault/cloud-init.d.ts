import * as pulumi from '@pulumi/pulumi';
type CreateCloudInitCustomData = {
  ipAddress: pulumi.Output<string>;
  vaultFileStoragePath: string;
  keyVault: {
    tenantId: string;
    name: pulumi.Output<string>;
    secret_name: string;
    client_id: pulumi.Output<string>;
  };
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    hostname: string;
    staging: boolean;
  };
  kubernetes: {
    token: pulumi.Output<string>;
    server: string;
    caCert: string;
  };
};
export declare function createCloudInitCustomData(
  input: CreateCloudInitCustomData,
): pulumi.Output<string>;
export {};
//# sourceMappingURL=cloud-init.d.ts.map
