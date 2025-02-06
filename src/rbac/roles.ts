import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';
import * as azure_native from '@pulumi/azure-native';

export const RoleUUID = {
  PrivateDNSZoneContributor: 'b12aa53e-6015-4669-85d0-8515ebb3ae7f',
  NetworkContributor: '4d97b98b-1d4f-4787-a291-c67834d212e7',
  KeyVaultSecretUser: '4633458b-17de-408a-b874-0445c86b69e6',
  KeyVaultSecretOfficer: 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7',
  KeyVaultCryptoUser: '12338af0-0e69-4776-bea7-57ae8d297424',
  KeyVaultCryptoOfficer: '14b46e9e-c2b7-41b4-b07b-48a6ebf60603',
  KeyVaultCertificateOfficer: 'a4417e6f-fecd-4de8-b567-7b0420556985',
  KeyVaultCertificateUser: 'db79e9a7-68ee-4b58-9aeb-b90e7c24fcba',
  KeyVaultDataAccessAdministrator: '8b54135c-b56d-4d72-a534-26097cfdc8d8',
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

export function assignRole(
  input: MDRoleAssignment,
): pulumi.Output<azure_native.authorization.RoleAssignment> {
  const roleAssingment = input.scope.apply((scope) => {
    const roleGUID = new random.RandomUuid(
      `${input.principal.type}-${input.principal.id}-assigned-role-${input.rbacRole}-for-${input.key}`,
      {},
    );
    const role = input.scope.apply((scope) => {
      return new azure_native.authorization.RoleAssignment(
        `role-${input.rbacRole}-assiged-to-${input.principal.id}-for-${scope}`,
        {
          principalId: input.principal.id,
          principalType: input.principal.type,
          roleAssignmentName: roleGUID.result,
          roleDefinitionId: `/subscriptions/${input.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${input.rbacRole}`,
          scope: scope,
        },
      );
    });
    return role;
  });
  return roleAssingment;
}

export function assignKeyVaultOfficers(input: {
  principal: RbacAssignee;
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
  name: string;
}): pulumi.Output<azure_native.authorization.RoleAssignment>[] {
  let assignments: pulumi.Output<azure_native.authorization.RoleAssignment>[] =
    [];
  let contributeSecretsRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultSecretOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeSecretsRole);
  let contributeCertificatesRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultCertificateOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCertificatesRole);
  let contributeCryptoRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultCryptoOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCryptoRole);
  return assignments;
}

export function assignKeyVaultUsers(input: {
  principal: RbacAssignee;
  keyVault: azure_native.keyvault.Vault;
  subscriptionId: string;
  name: string;
}): pulumi.Output<azure_native.authorization.RoleAssignment>[] {
  let assignments: pulumi.Output<azure_native.authorization.RoleAssignment>[] =
    [];
  let contributeSecretsRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultSecretUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeSecretsRole);
  let contributeCertificatesRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultCertificateUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCertificatesRole);
  let contributeCryptoRole = assignRole({
    principal: input.principal,
    rbacRole: RoleUUID.KeyVaultCryptoUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCryptoRole);
  return assignments;
}
