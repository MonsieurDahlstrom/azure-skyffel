import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
type CreateVirtualMachine = {
  keyVault: azure_native.keyvault.Vault;
  resourceGroup: azure_native.resources.ResourceGroup;
  subnet: azure_native.network.Subnet;
  tenantId: string;
  tls: {
    cloudflareApiToken: string;
    contactEmail: string;
    fqdn: string;
    isStaging: boolean;
  };
  user: {
    password: pulumi.Output<string>;
    username: pulumi.Output<string>;
  };
  vaultIdentity: azure_native.managedidentity.UserAssignedIdentity;
  vmSize: string;
  kubeconfig: pulumi.Output<string>;
};
export declare function createVirtualMachine(
  input: CreateVirtualMachine,
): Promise<
  [azure_native.compute.VirtualMachine, azure_native.network.NetworkInterface]
>;
export {};
//# sourceMappingURL=virtual-machine.d.ts.map
