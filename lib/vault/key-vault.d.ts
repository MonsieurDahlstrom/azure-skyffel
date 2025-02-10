import * as azure_native from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import * as AzureRoles from '../rbac/roles';
export declare let keyvault: azure_native.keyvault.Vault;
type SetupKeyVault = {
  resourceGroup: azure_native.resources.ResourceGroup;
  tenantId: string;
  subscriptionId: string;
  subnet: azure_native.network.Subnet;
  dnsZone: azure_native.network.PrivateZone;
  readers?: AzureRoles.RbacAssignee[];
  officers?: AzureRoles.RbacAssignee[];
  dataAccessManagers?: AzureRoles.RbacAssignee[];
};
export declare function createKeyVault(
  input: SetupKeyVault,
): Promise<
  [
    azure_native.keyvault.Vault,
    pulumi.Output<azure_native.authorization.RoleAssignment>[],
  ]
>;
export {};
//# sourceMappingURL=key-vault.d.ts.map
