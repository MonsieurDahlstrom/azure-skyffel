import * as azure_native from '@pulumi/azure-native';
export declare const RoleUUID: {
  PrivateDNSZoneContributor: string;
  NetworkContributor: string;
  KeyVaultSecretsUser: string;
  KeyVaultSecretOfficer: string;
  KeyVaultCryptoUser: string;
  KeyVaultCryptoOfficer: string;
  KeyVaultCertificateOfficer: string;
  KeyVaultCertificateUser: string;
};
type MDRoleAssignment = {
  principal: {
    id: string;
    type: string;
  };
  rbacRole: string;
  scope: string;
  key: string;
  subscriptionId: string;
};
export declare function assignRole(
  input: MDRoleAssignment,
): azure_native.authorization.RoleAssignment;
export declare function assignKeyVaultOfficers(input: {
  principal: {
    id: string;
    type: string;
  };
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
}): Promise<azure_native.authorization.RoleAssignment[]>;
export {};
//# sourceMappingURL=roles.d.ts.map
