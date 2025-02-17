import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

export let zones: Map<string, azure_native.network.GetPrivateZoneResult> =
  new Map();

export async function setup(
  stackLocation: string,
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork,
) {
  const stack = new pulumi.StackReference(stackLocation);
  const subscriptionId = await stack.getOutputValue('subscriptionId');
  const provider = new azure_native.Provider('provider', {
    subscriptionId,
  });
  const zonesData: { resourceGroupName: string; name: string }[] =
    await stack.getOutputValue('dnsZones');
  zonesData.forEach(async (zoneData) => {
    await linkPrivateDnsZone({
      key: `${network.name}-${zoneData.name.replace('.', '-')}`,
      dnsZoneName: zoneData.name,
      resourceGroupName: zoneData.resourceGroupName,
      networkId: network.id!,
      provider,
    });
    zones.set(
      zoneData.name,
      await azure_native.network.getPrivateZone(
        {
          resourceGroupName: zoneData.resourceGroupName,
          privateZoneName: zoneData.name,
        },
        { provider },
      ),
    );
  });
}

async function linkPrivateDnsZone(input: {
  key: string;
  dnsZoneName: string;
  resourceGroupName: string;
  networkId: string | pulumi.Output<string>;
  provider: azure_native.Provider;
}) {
  await azure_native.network
    .getVirtualNetworkLink({
      privateZoneName: input.dnsZoneName,
      resourceGroupName: input.resourceGroupName,
      virtualNetworkLinkName: `vnet-link-${input.key}`,
    })
    .catch((error) => {
      console.log(`getVirtualNetworkLink error: ${error}`);
      const link = new azure_native.network.VirtualNetworkLink(
        `vnet-link-${input.key}`,
        {
          location: 'Global',
          privateZoneName: input.dnsZoneName,
          registrationEnabled: false,
          resourceGroupName: input.resourceGroupName,
          virtualNetwork: {
            id: input.networkId,
          },
          virtualNetworkLinkName: `vnet-link-${input.key}`,
        },
        { provider: input.provider },
      );
      return link;
    });
}
