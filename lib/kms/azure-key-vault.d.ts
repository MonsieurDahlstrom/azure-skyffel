import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as AzureRoles from '../rbac/roles';
export type createKeyVaultInput = {
  name: string;
  resourceGroup: azure_native.resources.ResourceGroup;
  subnet?: azure_native.network.Subnet;
  subnetId?: string;
  dnsZone?: azure_native.network.PrivateZone;
  dnsZoneId?: string;
  readers?: AzureRoles.RbacAssignee[];
  officers?: AzureRoles.RbacAssignee[];
  dataAccessManagers?: AzureRoles.RbacAssignee[];
  tenantId: string;
  subscriptionId: string;
  tags?: {
    [key: string]: string;
  };
};
export declare function create(
  input: createKeyVaultInput,
): Promise<
  [
    azure_native.keyvault.Vault,
    pulumi.Output<azure_native.authorization.RoleAssignment>[],
    azure_native.network.PrivateEndpoint,
  ]
>;
//# sourceMappingURL=azure-key-vault.d.ts.map
