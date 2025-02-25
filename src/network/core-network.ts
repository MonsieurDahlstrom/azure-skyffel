import * as azure from '@pulumi/azure-native';

export enum Delegation {
  None = 0,
  GithubRunner,
  PrivateDNSResovler,
}
export interface Layout {
  name: string;
  layout: {
    cidr: string;
    subnets: { name: string; cidr: string; delegationType: string }[];
  };
}

export interface SubnetArgs extends azure.network.SubnetArgs {
  delegationType?: Delegation;
}

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

export function setupSubnets(snets: Map<string, SubnetArgs>) {
  for (const [key, value] of snets) {
    switch (value.delegationType) {
      case Delegation.GithubRunner:
        value.delegations = [
          {
            name: 'github-network-settings',
            actions: ['Microsoft.Network/virtualNetwork/join/action'],
            serviceName: 'Github.Network/networkSettings',
          },
        ];
        break;
      case Delegation.PrivateDNSResovler:
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
