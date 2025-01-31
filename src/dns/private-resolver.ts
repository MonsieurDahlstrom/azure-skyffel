import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

export let resolver: azure_native.network.DnsResolver;
export let inboundEndpoint: azure_native.network.InboundEndpoint;

type PrivateResolverInput = {
  resourceGroup: azure_native.resources.ResourceGroup;
  network: azure_native.network.VirtualNetwork;
  subnet: azure_native.network.Subnet;
};
export async function setup(input: PrivateResolverInput): Promise<boolean> {
  resolver = new azure_native.network.DnsResolver('split-dns-resolver', {
    dnsResolverName: 'split-dns',
    location: input.resourceGroup.location,
    resourceGroupName: input.resourceGroup.name,
    virtualNetwork: {
      id: input.network.id,
    },
    //TODO: has tags
  });
  inboundEndpoint = new azure_native.network.InboundEndpoint(
    'split-dns-inbound-endpoint',
    {
      dnsResolverName: resolver.name,
      inboundEndpointName: 'split-dns-inbound-endpoint',
      ipConfigurations: [
        {
          privateIpAllocationMethod:
            azure_native.network.IpAllocationMethod.Dynamic,
          subnet: {
            id: input.subnet.id,
          },
        },
      ],
      location: input.resourceGroup.location,
      resourceGroupName: input.resourceGroup.name,
      //TODO: has tags
    },
  );
  return true;
}
