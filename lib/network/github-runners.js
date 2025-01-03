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
exports.createGithubRunnerSubnet = createGithubRunnerSubnet;
const pulumi = __importStar(require('@pulumi/pulumi'));
const azure = __importStar(require('@pulumi/azure-native'));
const azapi = __importStar(require('@ediri/azapi'));
const githubNetworkDelegations = [
  {
    name: 'github-network-settings',
    actions: ['Microsoft.Network/virtualNetwork/join/action'],
    serviceName: 'Github.Network/networkSettings',
  },
];
function createGithubRunnerSubnet(
  virtualNetwork,
  resourceGroup,
  cidr,
  github_business_id,
) {
  const subnet = new azure.network.Subnet('github-runners', {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: cidr,
    delegations: githubNetworkDelegations,
  });
  const azapi_resource = new azapi.Resource('github_network_settings', {
    type: 'GitHub.Network/networkSettings@2024-04-02',
    name: 'github-network-settings',
    location: resourceGroup.location,
    parentId: resourceGroup.id,
    schemaValidationEnabled: false,
    body: pulumi.jsonStringify({
      properties: {
        businessId: github_business_id,
        subnetId: subnet.id,
      },
    }),
    responseExportValues: ['tags.GitHubId'],
  });
  return subnet;
}
/*
resource "azapi_resource" "github_network_settings" {
  type                      = "GitHub.Network/networkSettings@2024-04-02"
  name                      = "github-network-settings"
  location                  = var.location
  parent_id                 = var.resource_group_id
  schema_validation_enabled = false
  body = {
    properties = {
      businessId = var.github_business_id
      subnetId   = var.snet_id
    }
  }
  response_export_values = ["tags.GitHubId"]

  lifecycle {
    ignore_changes = [tags]
  }
}
*/
//# sourceMappingURL=github-runners.js.map
