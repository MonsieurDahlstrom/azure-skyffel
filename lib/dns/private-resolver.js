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
exports.inboundEndpoint = exports.resolver = void 0;
exports.setup = setup;
const azure_native = __importStar(require('@pulumi/azure-native'));
async function setup(input) {
  exports.resolver = new azure_native.network.DnsResolver(
    'split-dns-resolver',
    {
      dnsResolverName: 'split-dns',
      location: input.resourceGroup.location,
      resourceGroupName: input.resourceGroup.name,
      virtualNetwork: {
        id: input.network.id,
      },
      //TODO: has tags
    },
  );
  exports.inboundEndpoint = new azure_native.network.InboundEndpoint(
    'split-dns-inbound-endpoint',
    {
      dnsResolverName: exports.resolver.name,
      inboundEndpointName: 'split-dns-inbound-endpoint',
      ipConfigurations: [
        {
          privateIpAllocationMethod:
            azure_native.network.IpAllocationMethod.Dynamic,
          subnet: {
            id: input.subnet.id,
          },
        },
      ],
      location: input.resourceGroup.location,
      resourceGroupName: input.resourceGroup.name,
      //TODO: has tags
    },
  );
  return true;
}
//# sourceMappingURL=private-resolver.js.map
