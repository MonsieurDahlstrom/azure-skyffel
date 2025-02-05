import * as pulumi from '@pulumi/pulumi';
import { Subnet, NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Vault } from '@pulumi/azure-native/keyvault';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
export type VaultInput = {
  subnet: Subnet;
  resourceGroup: ResourceGroup;
  user: {
    username: string;
    password: pulumi.Output<string>;
  };
  vmSize: string;
  tenantId: string;
  admins: {
    principalId: string;
    type: string;
  }[];
  subscriptionId: string;
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    fqdn: string;
    isStaging: boolean;
  };
};
export declare let networkInterface: NetworkInterface;
export declare let virtualMachine: VirtualMachine;
export declare let keyVault: Vault;
export declare let vaultIdentity: UserAssignedIdentity;
export declare function setup(input: VaultInput): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
