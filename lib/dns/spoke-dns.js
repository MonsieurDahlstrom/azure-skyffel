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
exports.createRecordSet = createRecordSet;
const pulumi = __importStar(require('@pulumi/pulumi'));
const azure_native = __importStar(require('@pulumi/azure-native'));
exports.zones = new Map();
let resourceGroupName;
let stack;
let provider;
let subscriptionId;
async function setup(stackLocation, network) {
  stack = new pulumi.StackReference(stackLocation);
  resourceGroupName = await stack.getOutputValue('resourceGroupName');
  subscriptionId = await stack.getOutputValue('subscriptionId');
  provider = new azure_native.Provider('provider', {
    subscriptionId,
  });
  const zonesData = await stack.getOutputValue('dnsZones');
  //get the zones
  const getPrivateZonePromises = zonesData.map(async (zoneData) => {
    const zone = await azure_native.network.getPrivateZone(
      {
        resourceGroupName,
        privateZoneName: zoneData.name,
      },
      {
        provider,
      },
    );
    exports.zones.set(zoneData.name, zone);
  });
  await Promise.all(getPrivateZonePromises);
  //get the links
  const linkPromises = zonesData.map(async (zoneData) => {
    const linkExists = await checkLink({ network, zoneData });
    if (!linkExists) {
      return createLink({ network, zoneData });
    }
  });
  await Promise.all(linkPromises);
}
function createRecordSet(input) {
  return new azure_native.network.PrivateRecordSet(
    `arecord-${input.host}-${input.zone.name.replace('.', '-')}`,
    {
      aRecords: [
        {
          ipv4Address: input.ipv4Address,
        },
      ],
      privateZoneName: input.zone.name,
      recordType: input.recordType,
      relativeRecordSetName: input.host,
      resourceGroupName,
      ttl: 3600,
    },
    {
      provider,
    },
  );
}
async function checkLink(input) {
  if (typeof input.network.name === 'string') {
    const key = `${input.network.name}-${input.zoneData.name.replace('.', '-')}`;
    try {
      const link = await azure_native.network.getVirtualNetworkLink(
        {
          privateZoneName: input.zoneData.name,
          resourceGroupName: input.zoneData.resourceGroupName,
          virtualNetworkLinkName: key,
        },
        {
          provider,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  } else {
    return new Promise((resolve, reject) => {
      input.network.name.apply(async (name) => {
        const key = `${name}-${input.zoneData.name.replace('.', '-')}`;
        try {
          const link = await azure_native.network.getVirtualNetworkLink(
            {
              privateZoneName: input.zoneData.name,
              resourceGroupName: input.zoneData.resourceGroupName,
              virtualNetworkLinkName: key,
            },
            {
              provider,
            },
          );
          resolve(true);
        } catch (error) {
          resolve(false);
        }
      });
    });
  }
}
async function createLink(input) {
  if (typeof input.network.name === 'string') {
    const key = `${input.network.name}-${input.zoneData.name.replace('.', '-')}`;
    const link = new azure_native.network.VirtualNetworkLink(
      key,
      {
        location: 'Global',
        privateZoneName: input.zoneData.name,
        registrationEnabled: false,
        resourceGroupName: input.zoneData.resourceGroupName,
        virtualNetwork: {
          id: input.network.id,
        },
        virtualNetworkLinkName: `vnet-link-${key}`,
      },
      {
        provider,
      },
    );
  } else {
    input.network.name.apply(async (name) => {
      const key = `${name}-${input.zoneData.name.replace('.', '-')}`;
      const link = new azure_native.network.VirtualNetworkLink(
        key,
        {
          location: 'Global',
          privateZoneName: input.zoneData.name,
          registrationEnabled: false,
          resourceGroupName: input.zoneData.resourceGroupName,
          virtualNetwork: {
            id: input.network.id,
          },
          virtualNetworkLinkName: `vnet-link-${key}`,
        },
        {
          provider,
        },
      );
    });
  }
}
//# sourceMappingURL=spoke-dns.js.map
