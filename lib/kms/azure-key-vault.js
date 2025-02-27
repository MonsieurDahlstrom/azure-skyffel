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
exports.create = create;
const azure_native = __importStar(require('@pulumi/azure-native'));
const Random = __importStar(require('@pulumi/random'));
const AzureRoles = __importStar(require('../rbac/roles'));
async function create(input) {
  const randomKeyVaultName = new Random.RandomString(
    `kv-${input.name}-randomizer`,
    {
      length: 24 - (input.name.length + 4),
      special: false,
      lower: true,
      upper: false,
    },
  );
  //Create a keyault to keep the unsealed key for the hashicorp vault
  const keyVault = new azure_native.keyvault.Vault(`kv-${input.name}`, {
    vaultName: randomKeyVaultName.result.apply(
      (suffix) => `kv-${input.name}-${suffix}`,
    ),
    location: input.resourceGroup.location,
    resourceGroupName: input.resourceGroup.name,
    properties: {
      enableRbacAuthorization: true,
      publicNetworkAccess: 'Disabled',
      sku: {
        family: 'A',
        name: 'standard',
      },
      tenantId: input.tenantId,
    },
  });
  //Create a private endpoint for the keyvault
  const keyVaultPrivateEndpoint = new azure_native.network.PrivateEndpoint(
    `kv-pe-${input.name}`,
    {
      location: input.resourceGroup.location,
      resourceGroupName: input.resourceGroup.name,
      privateLinkServiceConnections: [
        {
          name: `kv-pe-conn-${input.name}`,
          privateLinkServiceId: keyVault.id,
          groupIds: ['vault'],
        },
      ],
      subnet: {
        id: input.subnet ? input.subnet.id : input.subnetId,
      },
    },
  );
  const keyVaultPrivateDnsZoneGroup =
    new azure_native.network.PrivateDnsZoneGroup(`kv-pdzg-${input.name}`, {
      resourceGroupName: input.resourceGroup.name,
      privateEndpointName: keyVaultPrivateEndpoint.name,
      privateDnsZoneConfigs: [
        {
          name: input.name,
          privateDnsZoneId: input.dnsZone ? input.dnsZone.id : input.dnsZoneId,
        },
      ],
    });
  const assignments = [];
  if (input.readers) {
    for (let reader of input.readers) {
      const readerAssignments = await AzureRoles.assignKeyVaultUsers({
        principal: reader,
        keyVault: keyVault,
        name: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(...readerAssignments);
    }
  }
  if (input.officers) {
    for (let officer of input.officers) {
      const officerAssignments = await AzureRoles.assignKeyVaultOfficers({
        principal: officer,
        keyVault: keyVault,
        name: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(...officerAssignments);
    }
  }
  if (input.dataAccessManagers) {
    for (let manager of input.dataAccessManagers) {
      const managerAssignment = await AzureRoles.assignRoleOutput({
        principal: manager,
        rbacRole: AzureRoles.RoleUUID.KeyVaultDataAccessAdministrator,
        scope: keyVault.id,
        key: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(managerAssignment);
    }
  }
  return [keyVault, assignments, keyVaultPrivateEndpoint];
}
//# sourceMappingURL=azure-key-vault.js.map
