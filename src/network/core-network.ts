import * as azure from '@pulumi/azure-native';

export let virtualNetwork: azure.network.VirtualNetwork;
export let subnets: Map<string, azure.network.Subnet> = new Map();

export function setupNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
  dnsServers?: string[],
) {
  virtualNetwork = new azure.network.VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
    dhcpOptions: {
      dnsServers: dnsServers,
    },
  });
}

export enum MDSubbnetDelegation {
  None = 0,
  GithubRunner,
  PrivateDNSResovler,
}
export interface MDSubnetArgs extends azure.network.SubnetArgs {
  delegationType?: MDSubbnetDelegation;
}
export function setupSubnets(snets: Map<string, MDSubnetArgs>) {
  for (const [key, value] of snets) {
    switch (value.delegationType) {
      case MDSubbnetDelegation.GithubRunner:
        value.delegations = [
          {
            name: 'github-network-settings',
            actions: ['Microsoft.Network/virtualNetwork/join/action'],
            serviceName: 'Github.Network/networkSettings',
          },
        ];
        break;
      case MDSubbnetDelegation.PrivateDNSResovler:
        value.delegations = [
          {
            name: 'Microsoft.Network.dnsResolvers',
            actions: ['Microsoft.Network/virtualNetwork/join/action'],
            serviceName: 'Microsoft.Network/dnsResolvers',
          },
        ];
        break;
      default:
        break;
    }
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
}
