import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare function createGithubRunnerSubnet(virtualNetwork: VirtualNetwork, resourceGroup: ResourceGroup, cidr: string, github_business_id: string): Subnet;
//# sourceMappingURL=github-runners.d.ts.map