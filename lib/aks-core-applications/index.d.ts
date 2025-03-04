import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export type CoreAppliocationArgs = {
  provider: k8s.Provider;
  cluster: azure_native.containerservice.ManagedCluster;
  subscriptionId: string;
  resourceGroupName: string;
  crossplane?: {
    version?: string;
    helmVersion?: string;
  };
  externalDNS?: {
    version?: string;
    tenantId: string;
    zoneData: {
      subscriptionId: string;
      resourceGroupName: string;
      zones: (
        | azure_native.network.PrivateZone
        | azure_native.network.GetPrivateZoneResult
      )[];
    };
  };
  traefikGateway?: {
    version?: string;
    helmVersion?: string;
    loadbalancerSubnetName: string | pulumi.Output<string>;
    hostname: string;
    tls: {
      certificate: string | pulumi.Output<string>;
      key: string | pulumi.Output<string>;
    };
  };
};
export declare function setup(input: CoreAppliocationArgs): Promise<void>;
//# sourceMappingURL=index.d.ts.map
