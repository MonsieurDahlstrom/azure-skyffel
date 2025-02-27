import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

export let zones: Map<string, azure_native.network.GetPrivateZoneResult> =
  new Map();

let provider: azure_native.Provider;
let subscriptionId: string;

export async function setup(
  stack: pulumi.StackReference,
  stackAzureSubscription: string,
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork,
) {
  provider = new azure_native.Provider('provider', {
    subscriptionId: stackAzureSubscription,
  });
  const zonesData: { resourceGroupName: string; name: string }[] =
    await stack.getOutputValue('dnsZones');
  //get the zones
  const getPrivateZonePromises = zonesData.map(async (zoneData) => {
    const zone = await azure_native.network.getPrivateZone(
      {
        resourceGroupName: zoneData.resourceGroupName,
        privateZoneName: zoneData.name,
      },
      {
        provider,
      },
    );
    zones.set(zoneData.name, zone);
  });
  await Promise.all(getPrivateZonePromises);
  //get the links
  const linkPromises = zonesData.map(async (zoneData) => {
    const linkExists = await checkLink({ network, zoneData });
    if (!linkExists) {
      return createLink({ network, zoneData });
    }
  });
  await Promise.all(linkPromises);
}

export function createRecordSet(input: {
  zone: azure_native.network.GetPrivateZoneResult;
  recordType: string;
  host: string;
  ipv4Address: string | pulumi.Output<string>;
  resourceGroupName: string | pulumi.Output<string>;
}): azure_native.network.PrivateRecordSet {
  return new azure_native.network.PrivateRecordSet(
    `arecord-${input.host}-${input.zone.name.replace('.', '-')}`,
    {
      aRecords: [
        {
          ipv4Address: input.ipv4Address,
        },
      ],
      privateZoneName: input.zone.name!,
      recordType: input.recordType,
      relativeRecordSetName: input.host,
      resourceGroupName: input.resourceGroupName,
      ttl: 3600,
    },
    {
      provider,
    },
  );
}

async function checkLink(input: {
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork;
  zoneData: { resourceGroupName: string; name: string };
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
        {
          provider,
        },
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
            {
              provider,
            },
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
      {
        provider,
      },
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
        {
          provider,
        },
      );
    });
  }
}
