'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.RoleUUID = void 0;
exports.assignRole = assignRole;
exports.assignKeyVaultOfficers = assignKeyVaultOfficers;
exports.assignKeyVaultUsers = assignKeyVaultUsers;
const random = __importStar(require('@pulumi/random'));
const azure_native = __importStar(require('@pulumi/azure-native'));
exports.RoleUUID = {
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
function assignRole(input) {
  const roleAssingment = input.scope.apply((scope) => {
    const roleGUID = new random.RandomUuid(
      `${input.principal.type}-${input.principal.id}-assigned-role-${input.rbacRole}-for-${input.key}`,
      {},
    );
    const role = new azure_native.authorization.RoleAssignment(
      `role-${input.rbacRole}-assiged-to-${input.principal.id}-for-${input.scope}`,
      {
        principalId: input.principal.id,
        principalType: input.principal.type,
        roleAssignmentName: roleGUID.result,
        roleDefinitionId: `/subscriptions/${input.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${input.rbacRole}`,
        scope: scope,
      },
    );
    return role;
  });
  return roleAssingment;
}
function assignKeyVaultOfficers(input) {
  let assignments = [];
  let contributeSecretsRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultSecretOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeSecretsRole);
  let contributeCertificatesRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultCertificateOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCertificatesRole);
  let contributeCryptoRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultCryptoOfficer,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCryptoRole);
  return assignments;
}
function assignKeyVaultUsers(input) {
  let assignments = [];
  let contributeSecretsRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultSecretUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeSecretsRole);
  let contributeCertificatesRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultCertificateUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCertificatesRole);
  let contributeCryptoRole = assignRole({
    principal: input.principal,
    rbacRole: exports.RoleUUID.KeyVaultCryptoUser,
    scope: input.keyVault.id,
    key: input.name,
    subscriptionId: input.subscriptionId,
  });
  assignments.push(contributeCryptoRole);
  return assignments;
}
//# sourceMappingURL=roles.js.map
