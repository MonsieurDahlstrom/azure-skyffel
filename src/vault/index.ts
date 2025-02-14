// pulumi imports
import * as pulumi from '@pulumi/pulumi';
import { RandomString } from '@pulumi/random';

//azure-native imports
import {
  VirtualNetwork,
  Subnet,
  NetworkInterface,
  PrivateZone,
} from '@pulumi/azure-native/network';
import {
  VirtualMachine,
  LinuxVMGuestPatchMode,
  SecurityTypes,
  CachingTypes,
  DiskCreateOptionTypes,
  StorageAccountTypes,
} from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Vault, Key, JsonWebKeyType } from '@pulumi/azure-native/keyvault';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { RoleAssignment } from '@pulumi/azure-native/authorization';
import * as AzureRoles from '../rbac/roles';
import { createKeyVault } from './key-vault';
import { createVirtualMachine } from './virtual-machine';

export type VaultInput = {
  subnetId: string;
  keyVault: {
    subnetId: string;
    dnsZoneId: string;
    readers?: AzureRoles.RbacAssignee[];
    officers?: AzureRoles.RbacAssignee[];
    dataAccessManagers?: AzureRoles.RbacAssignee[];
  };
  resourceGroup: ResourceGroup;
  user: {
    username: pulumi.Output<string>;
    password: pulumi.Output<string>;
  };
  vmSize: string;
  tenantId: string;
  subscriptionId: string;
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    fqdn: string;
    isStaging: boolean;
  };
  kubeconfig: pulumi.Output<string>;
};
export let networkInterface: NetworkInterface;
export let virtualMachine: VirtualMachine;
export let keyVault: Vault;
export let vaultIdentity: UserAssignedIdentity;

export async function setup(input: VaultInput): Promise<boolean> {
  // Create an identity to run hashicorp vault as
  vaultIdentity = new UserAssignedIdentity(`identity-vault`, {
    resourceGroupName: input.resourceGroup.name,
  });
  //create a random azure key vault name suffix
  const createKeyvaultTuple = await createKeyVault({
    ...input.keyVault,
    subnetId: input.subnetId,
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    resourceGroup: input.resourceGroup,
  });
  keyVault = createKeyvaultTuple[0];
  let assignments = [...createKeyvaultTuple[1]];
  // add the vault identity to the key vault rbac
  vaultIdentity.principalId.apply(async (principalId) => {
    assignments.push(
      AzureRoles.assignRoleOutput({
        principal: { id: principalId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultCryptoUser,
        scope: keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
    assignments.push(
      AzureRoles.assignRoleOutput({
        principal: { id: principalId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultSecretOfficer,
        scope: keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
  });
  // Create the VM
  const createVaultTuple = await createVirtualMachine({
    ...input,
    keyVault,
    vaultIdentity,
  });
  virtualMachine = createVaultTuple[0];
  networkInterface = createVaultTuple[1];
  return true;
}
