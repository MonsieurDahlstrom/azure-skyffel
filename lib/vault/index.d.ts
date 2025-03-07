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
export type certbot = {
  cloudflareApiToken: string;
  contactEmail: string;
  fqdn: string;
  isStaging: boolean;
};
export type tlsCertificate = {
  fqdn: string | pulumi.Output<string>;
  certificate: string | pulumi.Output<string>;
  issuer: string | pulumi.Output<string>;
  key: string | pulumi.Output<string>;
};
export type VaultInput = {
  subnetId?: string;
  subnet?: Subnet;
  keyVault: {
    subnetId?: string;
    subnet?: Subnet;
    dnsZoneId?: string;
    dnsZone?: PrivateZone;
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
  tls: certbot | tlsCertificate;
  kubeconfig: pulumi.Output<string>;
};
export declare let networkInterface: NetworkInterface;
export declare let virtualMachine: VirtualMachine;
export declare let keyVault: Vault;
export declare let vaultIdentity: UserAssignedIdentity;
export declare function setup(input: VaultInput): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
