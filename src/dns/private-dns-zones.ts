import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as AzureRoles from '../rbac/roles';

export const zones: Map<string, azure_native.network.PrivateZone> = new Map();

type PrivateDnsZoneContributorIdentity = {
  id: string;
  type: string;
};

type SetupInput = {
  resourceGroup: azure_native.resources.ResourceGroup;
  network: azure_native.network.VirtualNetwork;
  dnsZoneContributors?: PrivateDnsZoneContributorIdentity[];
  subscriptionId?: string;
  stack?: pulumi.StackReference;
  zones?: Map<string, pulumi.Output<string>>;
};
export async function setup(input: SetupInput): Promise<boolean> {
  if (input.stack === undefined) {
    await setupAsHub(input);
  } else {
    await setupAsSpoke(input);
  }
  return true;
}

async function setupAsHub(input: SetupInput): Promise<boolean> {
  input.zones!.forEach(async (zone, key) => {
    await createPrivateDnsZone({
      key,
      zone,
      resourceGroup: input.resourceGroup,
      network: input.network,
      dnsZoneContributors: input.dnsZoneContributors!,
      subscriptionId: input.subscriptionId!,
    });
  });
  return true;
}

async function setupAsSpoke(input: SetupInput): Promise<boolean> {
  const dnsResourceGroupName =
    await input.stack!.getOutputValue('resourceGroupName');
  const zones: string[] = await input.stack!.getOutputValue('dnsZones');
  for (const zone in zones) {
    await linkPrivateDnsZone({
      key: zone.replace('.', '-'),
      dnsZoneName: zone,
      resourceGroupName: dnsResourceGroupName,
      networkId: input.network.id,
    });
  }
  return true;
}

type CreatePrivateDnsZoneInput = {
  key: string;
  zone: pulumi.Output<string>;
  resourceGroup: azure_native.resources.ResourceGroup;
  network: azure_native.network.VirtualNetwork;
  dnsZoneContributors: PrivateDnsZoneContributorIdentity[];
  subscriptionId: string;
};
async function createPrivateDnsZone(
  input: CreatePrivateDnsZoneInput,
): Promise<boolean> {
  const privateDnsZone = new azure_native.network.PrivateZone(
    `private-dns-zone-${input.key}`,
    {
      location: 'Global',
      privateZoneName: input.zone,
      resourceGroupName: input.resourceGroup.name,
    },
    { dependsOn: [input.network, input.resourceGroup] },
  );
  const link = new azure_native.network.VirtualNetworkLink(
    `vnet-link-${input.key}`,
    {
      location: 'Global',
      privateZoneName: privateDnsZone.name,
      registrationEnabled: false,
      resourceGroupName: input.resourceGroup.name,
      virtualNetwork: {
        id: input.network.id,
      },
      virtualNetworkLinkName: `vnet-link-${input.key}`,
    },
    { dependsOn: [privateDnsZone, input.network, input.resourceGroup] },
  );
  zones.set(input.key, privateDnsZone);
  if (input.dnsZoneContributors.length > 0) {
    input.dnsZoneContributors.forEach(async (contributor) => {
      AzureRoles.assignRoleOutput({
        principal: contributor,
        rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
        scope: privateDnsZone.id,
        key: input.key,
        subscriptionId: input.subscriptionId,
      });
    });
  }
  return true;
}

async function linkPrivateDnsZone(input: {
  key: string;
  dnsZoneName: string;
  resourceGroupName: string;
  networkId: pulumi.Output<string>;
}) {
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
  );
}

export async function createAddressEntry(input: {
  ipAddress: string;
  name: string;
  dnsZone: azure_native.network.PrivateZone;
  resourceGroup: azure_native.resources.ResourceGroup;
}): Promise<boolean> {
  const recordSet = pulumi
    .all([input.dnsZone.name, input.resourceGroup.name])
    .apply(([dnsZoneName, resourceGroupName]) => {
      return new azure_native.network.PrivateRecordSet(
        `arecord-${input.name}-${dnsZoneName}`,
        {
          aRecords: [
            {
              ipv4Address: input.ipAddress,
            },
          ],
          privateZoneName: dnsZoneName,
          recordType: 'A',
          relativeRecordSetName: input.name,
          resourceGroupName: resourceGroupName,
          ttl: 3600,
        },
        { dependsOn: [input.dnsZone, input.resourceGroup] },
      );
    });
  return true;
}
