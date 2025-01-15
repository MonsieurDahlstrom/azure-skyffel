import * as pulumi from '@pulumi/pulumi';
import { VirtualNetwork, Subnet } from '@pulumi/azure-native/network';
import { NetworkSecurityGroup } from '@pulumi/azure-native/network';
import { RouteTable } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';

export let subnet: Subnet | undefined;
export let networkSecurityGroup: NetworkSecurityGroup | undefined;
export let routeTable: RouteTable | undefined;

/*
      {
        name: 'allow-ztna-ssh',
        access: 'Allow',
        direction: 'Inbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '22',
        sourceAddressPrefix: '100.96.0.0/12',
        destinationAddressPrefix: '*',
        priority: 100,
        description: 'Allow SSH from ZTNA',
      },
      {
        name: 'allow-https',
        access: 'Allow',
        direction: 'Inbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '100.96.0.0/12',
        destinationAddressPrefix: '*',
        priority: 110,
        description: 'Allow HTTPS traffic from ZTNA',
      },
      {
        name: 'allow-https',
        access: 'Allow',
        direction: 'Outbound',
        protocol: 'Tcp',
        sourcePortRange: '*',
        destinationPortRange: '443',
        sourceAddressPrefix: '*',
        destinationAddressPrefix: '*',
        description: 'Allow Outbound HTTPS traffic',
        priority: 120,
      },
      */

export type CloudflareNetworkInput = {
  resourceGroup: ResourceGroup;
  virtualNetwork: VirtualNetwork;
  subnetCidr: string;
};

export async function setup(input: CloudflareNetworkInput): Promise<boolean> {
  subnet = new Subnet('cloudflare-ztna-gateway', {
    resourceGroupName: input.resourceGroup.name,
    virtualNetworkName: input.virtualNetwork.name,
    addressPrefix: input.subnetCidr,
  });
  routeTable = new RouteTable('cloudflare-ztna-route-table', {
    resourceGroupName: input.resourceGroup.name,
    routes: [],
  });
  networkSecurityGroup = new NetworkSecurityGroup('cloudflare-ztna-nsg', {
    resourceGroupName: input.resourceGroup.name,
    location: input.resourceGroup.location,
    securityRules: [],
  });
  return true;
}
