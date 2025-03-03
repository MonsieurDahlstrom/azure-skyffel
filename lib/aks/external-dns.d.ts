import * as kubernetes from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export declare let helmChart: kubernetes.helm.v3.Chart;
export declare let identity: azure_native.managedidentity.UserAssignedIdentity;
export type ExternalDnsArgs = {
  resourceGroupName: string | pulumi.Output<string>;
  tenantId: string;
  subscriptionId: string;
  zones: (
    | azure_native.network.GetPrivateZoneResult
    | azure_native.network.PrivateZone
  )[];
  cluster: azure_native.containerservice.ManagedCluster;
  version?: string;
};
export declare function setup(input: ExternalDnsArgs): void;
//# sourceMappingURL=external-dns.d.ts.map
