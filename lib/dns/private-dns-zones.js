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
exports.createAddressEntry = createAddressEntry;
const azure_native = __importStar(require('@pulumi/azure-native'));
const AzureRoles = __importStar(require('../rbac/roles'));
exports.zones = new Map();
async function setup(input) {
  input.zones.forEach(async (zone, key) => {
    await createPrivateDnsZone({
      key,
      zone,
      resourceGroup: input.resourceGroup,
      network: input.network,
      dnsZoneContributors: input.dnsZoneContributors,
      subscriptionId: input.subscriptionId,
    });
  });
  return true;
}
async function createPrivateDnsZone(input) {
  const privateDnsZone = new azure_native.network.PrivateZone(
    `private-dns-zone-${input.key}`,
    {
      location: 'Global',
      privateZoneName: input.zone,
      resourceGroupName: input.resourceGroup.name,
    },
    { dependsOn: [input.network, input.resourceGroup] },
  );
  const link = new azure_native.network.VirtualNetworkLink(
    `vnet-link-${input.key}`,
    {
      location: 'Global',
      privateZoneName: privateDnsZone.name,
      registrationEnabled: false,
      resourceGroupName: input.resourceGroup.name,
      virtualNetwork: {
        id: input.network.id,
      },
      virtualNetworkLinkName: `vnet-link-${input.key}`,
    },
    { dependsOn: [privateDnsZone, input.network, input.resourceGroup] },
  );
  exports.zones.set(input.key, privateDnsZone);
  input.dnsZoneContributors.forEach(async (contributor) => {
    AzureRoles.assignRole({
      principal: contributor,
      rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
      scope: privateDnsZone.id,
      key: input.key,
      subscriptionId: input.subscriptionId,
    });
  });
  return true;
}
async function createAddressEntry(input) {
  const privateRecordSet = new azure_native.network.PrivateRecordSet(
    `arecord-${input.name}-${input.dnsZone.name}`,
    {
      aRecords: [
        {
          ipv4Address: input.ipAddress,
        },
      ],
      privateZoneName: input.dnsZone.name,
      recordType: 'A',
      relativeRecordSetName: input.name,
      resourceGroupName: input.resourceGroup.name,
      ttl: 3600,
    },
  );
  return true;
}
//# sourceMappingURL=private-dns-zones.js.map
