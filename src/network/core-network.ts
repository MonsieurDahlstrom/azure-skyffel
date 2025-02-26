import * as azure from '@pulumi/azure-native';

export enum Delegation {
  None,
  GithubRunner,
  PrivateDNSResovler,
}
export interface Layout {
  name: string;
  resourceGroup: azure.resources.ResourceGroup;
  layout: {
    cidr: string;
    dnsServers?: string[];
    subnets: {
      name: string;
      cidr: string;
      delegationType: string | Delegation;
    }[];
  };
}

export interface SubnetArgs extends azure.network.SubnetArgs {
  delegationType?: Delegation;
}

export let virtualNetwork: azure.network.VirtualNetwork | undefined;
export let subnets: Map<string, azure.network.Subnet> = new Map();

export async function setup(input: Layout) {
  await setupNetwork(
    input.resourceGroup,
    input.name,
    input.layout.cidr,
    input.layout.dnsServers,
  );
  const subnetPromises = input.layout.subnets.map(async (snet) => {
    const subnet = new azure.network.Subnet(snet.name, {
      resourceGroupName: input.resourceGroup.name,
      virtualNetworkName: virtualNetwork!.name,
      addressPrefix: snet.cidr,
      delegations: getDelegation(snet.delegationType),
    });
    subnets.set(snet.name, subnet);
  });
  await Promise.all(subnetPromises);
}

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

export function reset() {
  virtualNetwork = undefined;
  subnets = new Map();
}
function getDelegation(delegationType: string | Delegation) {
  const delegation =
    typeof delegationType === 'string'
      ? Delegation[delegationType as keyof typeof Delegation]
      : delegationType;
  switch (delegation) {
    case Delegation.GithubRunner: {
      return [
        {
          name: 'github-network-settings',
          actions: ['Microsoft.Network/virtualNetwork/join/action'],
          serviceName: 'Github.Network/networkSettings',
        },
      ];
    }
    case Delegation.PrivateDNSResovler: {
      return [
        {
          name: 'Microsoft.Network.dnsResolvers',
          actions: ['Microsoft.Network/virtualNetwork/join/action'],
          serviceName: 'Microsoft.Network/dnsResolvers',
        },
      ];
    }
    default:
      return [];
  }
}
