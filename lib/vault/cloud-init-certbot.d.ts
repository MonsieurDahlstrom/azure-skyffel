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
        cloudflareApiToken: string;
        contactEmail: string;
        fqdn: string;
        isStaging: boolean;
    };
    kubernetes: {
        token: pulumi.Output<string>;
        server: pulumi.Output<string>;
        caCert: pulumi.Output<string>;
    };
};
export declare function createCloudInitWithCertbot(input: CreateCloudInitCustomData): pulumi.Output<string>;
export {};
//# sourceMappingURL=cloud-init-certbot.d.ts.map