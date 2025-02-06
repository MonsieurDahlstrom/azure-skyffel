import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as Random from '@pulumi/random';
import * as AzureRoles from '../rbac/roles';

export type createKeyVaultInput = {
  name: string;
  resourceGroup: azure_native.resources.ResourceGroup;
  subnet: azure_native.network.Subnet;
  dnsZone: azure_native.network.PrivateZone;
  readers?: AzureRoles.RbacAssignee[];
  officers?: AzureRoles.RbacAssignee[];
  dataAccessManagers?: AzureRoles.RbacAssignee[];
  tenantId: string;
  subscriptionId: string;
  tags?: { [key: string]: string };
};
export async function create(
  input: createKeyVaultInput,
): Promise<
  [
    azure_native.keyvault.Vault,
    pulumi.Output<azure_native.authorization.RoleAssignment>[],
  ]
> {
  const randomKeyVaultName = new Random.RandomString('vault-name', {
    length: 24 - (input.name.length + 1),
    special: false,
    lower: true,
    upper: false,
  });
  //Create a keyault to keep the unsealed key for the hashicorp vault
  const keyVault = new azure_native.keyvault.Vault(`kv-${input.name}`, {
    vaultName: randomKeyVaultName.result.apply(
      (suffix) => `kv-${input.name}-${suffix}`,
    ),
    location: input.resourceGroup.location,
    resourceGroupName: input.resourceGroup.name,
    properties: {
      enableRbacAuthorization: true,
      publicNetworkAccess: 'Disabled',
      sku: {
        family: 'A',
        name: 'standard',
      },
      tenantId: input.tenantId,
    },
  });
  //Create a private endpoint for the keyvault
  const keyVaultPrivateEndpoint = new azure_native.network.PrivateEndpoint(
    `kv-pe-${input.name}`,
    {
      location: input.resourceGroup.location,
      resourceGroupName: input.resourceGroup.name,
      privateLinkServiceConnections: [
        {
          name: `kv-pe-conn-${input.name}`,
          privateLinkServiceId: keyVault.id,
          groupIds: ['vault'],
        },
      ],
      subnet: {
        id: input.subnet.id,
      },
    },
  );
  const keyVaultPrivateDnsZoneGroup =
    new azure_native.network.PrivateDnsZoneGroup(`kv-pdzg-${input.name}`, {
      resourceGroupName: input.resourceGroup.name,
      privateEndpointName: keyVaultPrivateEndpoint.name,
      privateDnsZoneConfigs: [
        {
          name: input.name,
          privateDnsZoneId: input.dnsZone.id,
        },
      ],
    });
  const assignments: pulumi.Output<azure_native.authorization.RoleAssignment>[] =
    [];
  if (input.readers) {
    for (let reader of input.readers) {
      const readerAssignments = await AzureRoles.assignKeyVaultUsers({
        principal: reader,
        keyVault: keyVault,
        name: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(...readerAssignments);
    }
  }
  if (input.officers) {
    for (let officer of input.officers) {
      const officerAssignments = await AzureRoles.assignKeyVaultOfficers({
        principal: officer,
        keyVault: keyVault,
        name: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(...officerAssignments);
    }
  }
  if (input.dataAccessManagers) {
    for (let manager of input.dataAccessManagers) {
      const managerAssignment = await AzureRoles.assignRole({
        principal: manager,
        rbacRole: AzureRoles.RoleUUID.KeyVaultDataAccessAdministrator,
        scope: keyVault.id,
        key: input.name,
        subscriptionId: input.subscriptionId,
      });
      assignments.push(managerAssignment);
    }
  }
  return [keyVault, assignments];
}
