import * as pulumi from '@pulumi/pulumi';
import {
  VirtualNetwork,
  Subnet,
  RouteTable,
  NetworkSecurityGroup,
} from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import * as azapi from '@ediri/azapi';

const githubNetworkDelegations = [
  {
    name: 'github-network-settings',
    actions: ['Microsoft.Network/virtualNetwork/join/action'],
    serviceName: 'Github.Network/networkSettings',
  },
];

export function createGithubRunnerSubnet(
  virtualNetwork: VirtualNetwork,
  resourceGroup: ResourceGroup,
  cidr: string,
  github_business_id: string,
): Subnet {
  const subnet = new Subnet('github-runners', {
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
