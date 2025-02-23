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
  RoleBasedAccessControlAdministrator: string;
};
export type RbacAssignee = {
  id: string;
  type: string;
};
export declare function assignRole(input: {
  principal: RbacAssignee;
  rbacRole: string;
  scope: string;
  key: string;
  subscriptionId: string;
}): azure_native.authorization.RoleAssignment;
export declare function assignRoleOutput(input: {
  principal: RbacAssignee;
  rbacRole: string;
  scope: pulumi.Output<string>;
  key: string;
  subscriptionId: string;
}): pulumi.Output<azure_native.authorization.RoleAssignment>;
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
//# sourceMappingURL=roles.d.ts.map
