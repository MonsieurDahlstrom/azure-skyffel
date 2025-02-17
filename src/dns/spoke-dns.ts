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
    zones.set(
      zoneData.name,
      await azure_native.network.getPrivateZone(
        {
          resourceGroupName: zoneData.resourceGroupName,
          privateZoneName: zoneData.name,
        },
        {
          provider,
        },
      ),
    );
  });
  const linkPromises = zonesData.map(async (zoneData) => {
    const linkExists = await checkLink({ network, zoneData, provider });
    if (!linkExists) {
      return createLink({ network, zoneData, provider });
    }
  });
  await Promise.all(linkPromises);
}

async function checkLink(input: {
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork;
  zoneData: { resourceGroupName: string; name: string };
  provider: azure_native.Provider;
}): Promise<boolean> {
  if (typeof input.network.name === 'string') {
    const key = `${input.network.name}-${input.zoneData.name.replace('.', '-')}`;
    try {
      const link = await azure_native.network.getVirtualNetworkLink(
        {
          privateZoneName: input.zoneData.name,
          resourceGroupName: input.zoneData.resourceGroupName,
          virtualNetworkLinkName: key,
        },
        { provider: input.provider },
      );
      return true;
    } catch (error) {
      return false;
    }
  } else {
    return new Promise((resolve, reject) => {
      (input.network.name as pulumi.Output<string>).apply(async (name) => {
        const key = `${name}-${input.zoneData.name.replace('.', '-')}`;
        try {
          const link = await azure_native.network.getVirtualNetworkLink(
            {
              privateZoneName: input.zoneData.name,
              resourceGroupName: input.zoneData.resourceGroupName,
              virtualNetworkLinkName: key,
            },
            { provider: input.provider },
          );
          resolve(true);
        } catch (error) {
          resolve(false);
        }
      });
    });
  }
}

async function createLink(input: {
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork;
  zoneData: { resourceGroupName: string; name: string };
  provider: azure_native.Provider;
}) {
  if (typeof input.network.name === 'string') {
    const key = `${input.network.name}-${input.zoneData.name.replace('.', '-')}`;
    const link = new azure_native.network.VirtualNetworkLink(
      key,
      {
        location: 'Global',
        privateZoneName: input.zoneData.name,
        registrationEnabled: false,
        resourceGroupName: input.zoneData.resourceGroupName,
        virtualNetwork: {
          id: input.network.id,
        },
        virtualNetworkLinkName: `vnet-link-${key}`,
      },
      { provider: input.provider },
    );
  } else {
    input.network.name.apply(async (name) => {
      const key = `${name}-${input.zoneData.name.replace('.', '-')}`;
      const link = new azure_native.network.VirtualNetworkLink(
        key,
        {
          location: 'Global',
          privateZoneName: input.zoneData.name,
          registrationEnabled: false,
          resourceGroupName: input.zoneData.resourceGroupName,
          virtualNetwork: {
            id: input.network.id,
          },
          virtualNetworkLinkName: `vnet-link-${key}`,
        },
        { provider: input.provider },
      );
    });
  }
}
