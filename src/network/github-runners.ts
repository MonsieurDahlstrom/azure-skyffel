import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure-native';
import * as azapi from '@ediri/azapi';

const githubNetworkDelegations = [
  {
    name: 'github-network-delegation',
    service_delegation: [
      {
        actions: ['Microsoft.Network/virtualNetworks/subnets/join/action'],
        name: 'GitHub.Network/networkSettings',
      },
    ],
  },
];

export function createGithubRunnerSubnet(
  virtualNetwork: azure.network.VirtualNetwork,
  resourceGroup: azure.resources.ResourceGroup,
  cidr: string,
  github_business_id: string,
): azure.network.Subnet {
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
