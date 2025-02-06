import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export declare const RoleUUID: {
  PrivateDNSZoneContributor: string;
  NetworkContributor: string;
  KeyVaultSecretUser: string;
  KeyVaultSecretOfficer: string;
  KeyVaultCryptoUser: string;
  KeyVaultCryptoOfficer: string;
  KeyVaultCertificateOfficer: string;
  KeyVaultCertificateUser: string;
  KeyVaultDataAccessAdministrator: string;
};
export type RbacAssignee = {
  id: string;
  type: string;
};
type MDRoleAssignment = {
  principal: RbacAssignee;
  rbacRole: string;
  scope: pulumi.Output<string>;
  key: string;
  subscriptionId: string;
};
export declare function assignRole(
  input: MDRoleAssignment,
): pulumi.Output<azure_native.authorization.RoleAssignment>;
export declare function assignKeyVaultOfficers(input: {
  principal: RbacAssignee;
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
  name: string;
}): pulumi.Output<azure_native.authorization.RoleAssignment>[];
export declare function assignKeyVaultUsers(input: {
  principal: RbacAssignee;
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
  name: string;
}): pulumi.Output<azure_native.authorization.RoleAssignment>[];
export {};
//# sourceMappingURL=roles.d.ts.map
