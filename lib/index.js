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
exports.AzureVnet =
  exports.AzureRoles =
  exports.AzureKeyVault =
  exports.AzureKubernetesApplications =
  exports.AzureKubernetes =
  exports.Vault =
  exports.SpokeDNS =
  exports.HubDNS =
  exports.HubDNSResolver =
  exports.Cloudflared =
    void 0;
exports.Cloudflared = __importStar(require('./cloudflare/cloudflared.js'));
exports.HubDNSResolver = __importStar(require('./dns/hub-dns-resolver'));
exports.HubDNS = __importStar(require('./dns/hub-dns'));
exports.SpokeDNS = __importStar(require('./dns/spoke-dns'));
exports.Vault = __importStar(require('./vault'));
exports.AzureKubernetes = __importStar(require('./aks/managed-cluster'));
exports.AzureKubernetesApplications = __importStar(
  require('./aks-core-applications'),
);
exports.AzureKeyVault = __importStar(require('./kms/azure-key-vault'));
exports.AzureRoles = __importStar(require('./rbac/roles'));
exports.AzureVnet = __importStar(require('./network/core-network.js'));
//# sourceMappingURL=index.js.map
