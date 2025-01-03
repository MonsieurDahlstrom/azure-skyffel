import * as azure from '@pulumi/azure-native';
export declare function createGithubRunnerSubnet(
  virtualNetwork: azure.network.VirtualNetwork,
  resourceGroup: azure.resources.ResourceGroup,
  cidr: string,
  github_business_id: string,
): azure.network.Subnet;
//# sourceMappingURL=github-runners.d.ts.map
