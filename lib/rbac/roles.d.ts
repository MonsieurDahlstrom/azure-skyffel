import * as pulumi from '@pulumi/pulumi';
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
type RoleAssignment = {
  principal: {
    id: string;
    type: string;
  };
  rbacRole: string;
  scope: pulumi.Input<string>;
  key: pulumi.Input<string>;
  subscriptionId: pulumi.Input<string>;
};
export declare function assignRole(
  input: RoleAssignment,
): azure_native.authorization.RoleAssignment;
export declare function assignKeyVaultOfficers(input: {
  principal: {
    id: string;
    type: string;
  };
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
}): azure_native.authorization.RoleAssignment[];
export {};
//# sourceMappingURL=roles.d.ts.map
