import * as pulumi from '@pulumi/pulumi';
import {
  Subnet,
  NetworkInterface,
  PrivateZone,
} from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Vault } from '@pulumi/azure-native/keyvault';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import * as AzureRoles from '../rbac/roles';
export type VaultInput = {
  subnet: Subnet;
  keyVault: {
    subnet: Subnet;
    dnsZone: PrivateZone;
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
  kubeconfig: string;
};
export declare let networkInterface: NetworkInterface;
export declare let virtualMachine: VirtualMachine;
export declare let keyVault: Vault;
export declare let vaultIdentity: UserAssignedIdentity;
export declare function setup(input: VaultInput): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
