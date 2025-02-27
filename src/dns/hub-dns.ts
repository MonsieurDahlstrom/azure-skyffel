import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as AzureRoles from '../rbac/roles';

export const zones: Map<string, azure_native.network.PrivateZone> = new Map();
let resourceGroup: azure_native.resources.ResourceGroup;

type PrivateDnsZoneContributorIdentity = {
  id: string;
  type: string;
};

type SetupInput = {
  resourceGroup: azure_native.resources.ResourceGroup;
  network: azure_native.network.VirtualNetwork;
  dnsZoneContributors?: PrivateDnsZoneContributorIdentity[];
  dnsZoneRoleAdministrators?: PrivateDnsZoneContributorIdentity[];
  subscriptionId?: string;
  stack?: pulumi.StackReference;
  zones?: Map<string, string | pulumi.Output<string>>;
};
export async function setup(input: SetupInput): Promise<boolean> {
  resourceGroup = input.resourceGroup;
  input.zones!.forEach(async (zone, key) => {
    await createPrivateDnsZone({
      key,
      zone,
      resourceGroup,
      network: input.network,
      dnsZoneContributors: input.dnsZoneContributors,
      dnsZoneRoleAdministrators: input.dnsZoneRoleAdministrators,
      subscriptionId: input.subscriptionId!,
    });
  });
  return true;
}

export function outputs(): {
  dnsZones: {
    resourceGroupName: pulumi.Output<string>;
    name: pulumi.Output<string>;
  }[];
} {
  let dnsZoneOutputs: {
    resourceGroupName: pulumi.Output<string>;
    name: pulumi.Output<string>;
  }[] = [];
  zones.forEach((value, key, map) => {
    dnsZoneOutputs.push({
      resourceGroupName: resourceGroup.name,
      name: value.name,
    });
  });
  return { dnsZones: dnsZoneOutputs };
}

type CreatePrivateDnsZoneInput = {
  key: string;
  zone: string | pulumi.Output<string>;
  resourceGroup: azure_native.resources.ResourceGroup;
  network: azure_native.network.VirtualNetwork;
  dnsZoneContributors?: PrivateDnsZoneContributorIdentity[];
  dnsZoneRoleAdministrators?: PrivateDnsZoneContributorIdentity[];
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
  if (input.dnsZoneContributors) {
    input.dnsZoneContributors.forEach((contributor) => {
      return AzureRoles.assignRoleOutput({
        principal: contributor,
        rbacRole: AzureRoles.RoleUUID.PrivateDNSZoneContributor,
        scope: privateDnsZone.id,
        key: input.key,
        subscriptionId: input.subscriptionId,
      });
    });
  }
  if (input.dnsZoneRoleAdministrators) {
    input.dnsZoneRoleAdministrators.forEach((contributor) => {
      return AzureRoles.assignRoleOutput({
        principal: contributor,
        rbacRole: AzureRoles.RoleUUID.RoleBasedAccessControlAdministrator,
        scope: privateDnsZone.id,
        key: input.key,
        subscriptionId: input.subscriptionId,
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
