import * as azure_native from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import * as KeyVault from '../kms/azure-key-vault';
import * as AzureRoles from '../rbac/roles';

export let keyvault: azure_native.keyvault.Vault;

type SetupKeyVault = {
  resourceGroup: azure_native.resources.ResourceGroup;
  tenantId: string;
  subscriptionId: string;
  subnetId?: string;
  subnet?: azure_native.network.Subnet;
  dnsZone?: azure_native.network.PrivateZone;
  dnsZoneId?: string;
  readers?: AzureRoles.RbacAssignee[];
  officers?: AzureRoles.RbacAssignee[];
  dataAccessManagers?: AzureRoles.RbacAssignee[];
};
export async function createKeyVault(
  input: SetupKeyVault,
): Promise<
  [
    azure_native.keyvault.Vault,
    pulumi.Output<azure_native.authorization.RoleAssignment>[],
    azure_native.network.PrivateEndpoint,
  ]
> {
  const KVTuple = await KeyVault.create({
    name: 'vault',
    resourceGroup: input.resourceGroup,
    subnetId: input.subnetId,
    subnet: input.subnet,
    dnsZoneId: input.dnsZoneId,
    dnsZone: input.dnsZone,
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    readers: input.readers,
    officers: input.officers,
    dataAccessManagers: input.dataAccessManagers,
  });
  const autoUnsealSecret = new azure_native.keyvault.Key(
    'secret-vault-auto-unseal',
    {
      keyName: 'auto-unseal',
      resourceGroupName: input.resourceGroup.name,
      vaultName: KVTuple[0].name,
      properties: {
        kty: azure_native.keyvault.JsonWebKeyType.RSA,
        keySize: 2048,
        keyOps: ['wrapKey', 'unwrapKey'],
      },
    },
    { dependsOn: [...KVTuple[1], KVTuple[2]] },
  );
  return KVTuple;
}
