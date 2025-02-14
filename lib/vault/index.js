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
exports.vaultIdentity =
  exports.keyVault =
  exports.virtualMachine =
  exports.networkInterface =
    void 0;
exports.setup = setup;
const managedidentity_1 = require('@pulumi/azure-native/managedidentity');
const AzureRoles = __importStar(require('../rbac/roles'));
const key_vault_1 = require('./key-vault');
const virtual_machine_1 = require('./virtual-machine');
async function setup(input) {
  // Create an identity to run hashicorp vault as
  exports.vaultIdentity = new managedidentity_1.UserAssignedIdentity(
    `identity-vault`,
    {
      resourceGroupName: input.resourceGroup.name,
    },
  );
  //create a random azure key vault name suffix
  const createKeyvaultTuple = await (0, key_vault_1.createKeyVault)({
    ...input.keyVault,
    subnet: input.subnet,
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    resourceGroup: input.resourceGroup,
  });
  exports.keyVault = createKeyvaultTuple[0];
  let assignments = [...createKeyvaultTuple[1]];
  // add the vault identity to the key vault rbac
  exports.vaultIdentity.principalId.apply(async (principalId) => {
    assignments.push(
      AzureRoles.assignRoleOutput({
        principal: { id: principalId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultCryptoUser,
        scope: exports.keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
    assignments.push(
      AzureRoles.assignRoleOutput({
        principal: { id: principalId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultSecretOfficer,
        scope: exports.keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
  });
  // Create the VM
  const createVaultTuple = await (0, virtual_machine_1.createVirtualMachine)({
    ...input,
    keyVault: exports.keyVault,
    vaultIdentity: exports.vaultIdentity,
  });
  exports.virtualMachine = createVaultTuple[0];
  exports.networkInterface = createVaultTuple[1];
  return true;
}
//# sourceMappingURL=index.js.map
