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
exports.adminCredentials = exports.clusterIdentity = exports.cluster = void 0;
exports.setup = setup;
const containerservice_1 = require('@pulumi/azure-native/containerservice');
const managedidentity_1 = require('@pulumi/azure-native/managedidentity');
const AzureRoles = __importStar(require('../rbac/roles'));
const pulumi = __importStar(require('@pulumi/pulumi'));
async function setup(input) {
  //create an entra identity for the cluster
  exports.clusterIdentity = new managedidentity_1.UserAssignedIdentity(
    `identity-${input.name}`,
    {
      resourceGroupName: input.resourceGroup.name,
    },
  );
  const neededRoles = pulumi
    .all([exports.clusterIdentity.principalId])
    .apply(([principalId]) => {
      let networkRole = grantNetworkAccessToIdentity(principalId, input);
      let privateDnsRole = grantDNSContributorToIdentity(principalId, input);
      return [networkRole, privateDnsRole];
    });
  // Create the AKS cluster
  exports.cluster = new containerservice_1.ManagedCluster(
    input.name,
    {
      resourceGroupName: input.resourceGroup.name,
      identity: {
        type: containerservice_1.ResourceIdentityType.UserAssigned,
        userAssignedIdentities: [exports.clusterIdentity.id],
      },
      networkProfile: {
        networkDataplane: containerservice_1.NetworkDataplane.Cilium,
        networkPlugin: containerservice_1.NetworkPlugin.Azure,
        networkPluginMode: containerservice_1.NetworkPluginMode.Overlay,
        podCidr: '172.16.4.0/22',
        serviceCidr: '172.16.0.0/24',
        dnsServiceIP: '172.16.0.10',
      },
      agentPoolProfiles: [
        {
          count: input.defaultNode.min,
          maxPods: 110,
          mode: 'System',
          name: 'agentpool',
          nodeLabels: {},
          osDiskSizeGB: input.defaultNode.diskSize,
          osDiskType: input.defaultNode.osDiskType,
          osType: 'Linux',
          type: 'VirtualMachineScaleSets',
          vmSize: input.defaultNode.vmSize,
          vnetSubnetID: input.nodesId,
          availabilityZones: input.defaultNode.zones,
        },
      ],
      apiServerAccessProfile: {
        enablePrivateCluster: true,
        enablePrivateClusterPublicFQDN: true,
        disableRunCommand: false,
        privateDNSZone: input.privateDnsZoneId,
      },
      autoScalerProfile: {
        scaleDownDelayAfterAdd: '15m',
        scanInterval: '30s',
      },
      dnsPrefix: input.name,
      enableRBAC: true,
      kubernetesVersion: '1.31',
      publicNetworkAccess: 'Disabled',
      autoUpgradeProfile: {
        upgradeChannel: containerservice_1.UpgradeChannel.Node_image,
      },
    },
    { dependsOn: neededRoles },
  );
  exports.adminCredentials = (0,
  containerservice_1.listManagedClusterAdminCredentialsOutput)({
    resourceGroupName: input.resourceGroup.name,
    resourceName: exports.cluster.name,
  });
  return true;
}
function grantNetworkAccessToIdentity(principalId, input) {
  if (typeof input.networkId === 'string') {
    return AzureRoles.assignRole({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.NetworkContributor,
      scope: input.networkId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  } else {
    return AzureRoles.assignRoleOutput({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.NetworkContributor,
      scope: input.networkId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  }
}
function grantDNSContributorToIdentity(principalId, input) {
  if (typeof input.privateDnsZoneId === 'string') {
    return AzureRoles.assignRole({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
      scope: input.privateDnsZoneId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  } else {
    return AzureRoles.assignRoleOutput({
      principal: {
        id: principalId,
        type: 'ServicePrincipal',
      },
      rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
      scope: input.privateDnsZoneId,
      key: 'kubernetes',
      subscriptionId: input.subscriptionId,
    });
  }
}
//# sourceMappingURL=managed-cluster.js.map
