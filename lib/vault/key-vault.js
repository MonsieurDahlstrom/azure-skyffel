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
exports.keyvault = void 0;
exports.createKeyVault = createKeyVault;
const azure_native = __importStar(require('@pulumi/azure-native'));
const KeyVault = __importStar(require('../kms/azure-key-vault'));
async function createKeyVault(input) {
  const KVTuple = await KeyVault.create({
    name: 'vault',
    resourceGroup: input.resourceGroup,
    subnetId: input.subnetId,
    subnet: input.subnet,
    dnsZoneId: input.dnsZoneId,
    dnsZone: input.dnsZone,
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    readers: input.readers,
    officers: input.officers,
    dataAccessManagers: input.dataAccessManagers,
  });
  const autoUnsealSecret = new azure_native.keyvault.Key(
    'secret-vault-auto-unseal',
    {
      keyName: 'auto-unseal',
      resourceGroupName: input.resourceGroup.name,
      vaultName: KVTuple[0].name,
      properties: {
        kty: azure_native.keyvault.JsonWebKeyType.RSA,
        keySize: 2048,
        keyOps: ['wrapKey', 'unwrapKey'],
      },
    },
    { dependsOn: [...KVTuple[1], KVTuple[2]] },
  );
  return KVTuple;
}
//# sourceMappingURL=key-vault.js.map
