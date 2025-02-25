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
exports.resourceGroupName = exports.snets = exports.network = void 0;
exports.setup = setup;
const pulumi = __importStar(require('@pulumi/pulumi'));
const azure_native = __importStar(require('@pulumi/azure-native'));
exports.snets = new Map();
async function setup(stackLocation) {
  const stack = new pulumi.StackReference(stackLocation);
  exports.resourceGroupName =
    await stack.requireOutputValue('resourceGroupName');
  const networkName = await stack.requireOutputValue('networkName');
  exports.network = await azure_native.network.getVirtualNetwork({
    resourceGroupName: exports.resourceGroupName,
    virtualNetworkName: networkName,
  });
  const snetData = await stack.getOutputValue('subnetNames');
  snetData.forEach(async (snetData) => {
    exports.snets.set(
      snetData.name,
      await azure_native.network.getSubnet({
        resourceGroupName: exports.resourceGroupName,
        virtualNetworkName: networkName,
        subnetName: snetData.name,
      }),
    );
  });
  return true;
}
//# sourceMappingURL=SpokeNetwork.js.map
