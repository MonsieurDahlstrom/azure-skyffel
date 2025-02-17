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
exports.zones = void 0;
exports.setup = setup;
const pulumi = __importStar(require('@pulumi/pulumi'));
const azure_native = __importStar(require('@pulumi/azure-native'));
exports.zones = new Map();
async function setup(stackLocation, network) {
  const stack = new pulumi.StackReference(stackLocation);
  const subscriptionId = await stack.getOutputValue('subscriptionId');
  const provider = new azure_native.Provider('provider', {
    subscriptionId,
  });
  const zonesData = await stack.getOutputValue('dnsZones');
  zonesData.forEach(async (zoneData) => {
    if (typeof network.name === 'string') {
      await linkPrivateDnsZone({
        key: `${network.name}-${zoneData.name.replace('.', '-')}`,
        dnsZoneName: zoneData.name,
        resourceGroupName: zoneData.resourceGroupName,
        networkId: network.id,
        provider,
      });
      exports.zones.set(
        zoneData.name,
        await azure_native.network.getPrivateZone(
          {
            resourceGroupName: zoneData.resourceGroupName,
            privateZoneName: zoneData.name,
          },
          { provider },
        ),
      );
    } else {
      network.name.apply(async (name) => {
        await linkPrivateDnsZone({
          key: `${name}-${zoneData.name.replace('.', '-')}`,
          dnsZoneName: zoneData.name,
          resourceGroupName: zoneData.resourceGroupName,
          networkId: network.id,
          provider,
        });
        exports.zones.set(
          zoneData.name,
          await azure_native.network.getPrivateZone(
            {
              resourceGroupName: zoneData.resourceGroupName,
              privateZoneName: zoneData.name,
            },
            { provider },
          ),
        );
      });
    }
  });
}
async function linkPrivateDnsZone(input) {
  await azure_native.network
    .getVirtualNetworkLink({
      privateZoneName: input.dnsZoneName,
      resourceGroupName: input.resourceGroupName,
      virtualNetworkLinkName: input.key,
    })
    .catch((error) => {
      console.log(`getVirtualNetworkLink error: ${error}`);
      const link = new azure_native.network.VirtualNetworkLink(
        input.key,
        {
          location: 'Global',
          privateZoneName: input.dnsZoneName,
          registrationEnabled: false,
          resourceGroupName: input.resourceGroupName,
          virtualNetwork: {
            id: input.networkId,
          },
          virtualNetworkLinkName: `vnet-link-${input.key}`,
        },
        { provider: input.provider },
      );
      return link;
    });
}
//# sourceMappingURL=spoke-dns.js.map
