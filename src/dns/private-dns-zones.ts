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
  zones: Map<string, pulumi.Output<string>>;
  dnsZoneContributors: PrivateDnsZoneContributorIdentity[];
  subscriptionId: string;
};
export async function setup(input: SetupInput): Promise<boolean> {
  input.zones.forEach(async (zone, key) => {
    await createPrivateDnsZone({
      key,
      zone,
      resourceGroup: input.resourceGroup,
      network: input.network,
      dnsZoneContributors: input.dnsZoneContributors,
      subscriptionId: input.subscriptionId,
    });
  });
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
    privateDnsZone.id.apply((privateDnsZoneId) => {
      input.dnsZoneContributors.forEach(async (contributor) => {
        AzureRoles.assignRole({
          principal: contributor,
          rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
          scope: privateDnsZoneId,
          key: input.key,
          subscriptionId: input.subscriptionId,
        });
      });
    });
  }
  return true;
}

export async function createAddressEntry(input: {
  ipAddress: string;
  name: string;
  dnsZone: azure_native.network.PrivateZone;
  resourceGroup: azure_native.resources.ResourceGroup;
}): Promise<boolean> {
  const privateRecordSet = new azure_native.network.PrivateRecordSet(
    `arecord-${input.name}-${input.dnsZone.name}`,
    {
      aRecords: [
        {
          ipv4Address: input.ipAddress,
        },
      ],
      privateZoneName: input.dnsZone.name,
      recordType: 'A',
      relativeRecordSetName: input.name,
      resourceGroupName: input.resourceGroup.name,
      ttl: 3600,
    },
  );
  return true;
}
