import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
type certbot = {
    cloudflareApiToken: string;
    contactEmail: string;
    fqdn: string;
    isStaging: boolean;
};
type tlsCertificate = {
    fqdn: string;
    certificate: string;
    issuer: string;
    key: string;
};
type CreateVirtualMachine = {
    keyVault: azure_native.keyvault.Vault;
    resourceGroup: azure_native.resources.ResourceGroup;
    subnetId?: string;
    subnet?: azure_native.network.Subnet;
    tenantId: string;
    tls: certbot | tlsCertificate;
    user: {
        password: pulumi.Output<string>;
        username: pulumi.Output<string>;
    };
    vaultIdentity: azure_native.managedidentity.UserAssignedIdentity;
    vmSize: string;
    kubeconfig: pulumi.Output<string>;
};
export declare function createVirtualMachine(input: CreateVirtualMachine): Promise<[
    azure_native.compute.VirtualMachine,
    azure_native.network.NetworkInterface
]>;
export {};
//# sourceMappingURL=virtual-machine.d.ts.map