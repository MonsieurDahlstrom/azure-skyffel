import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

import * as ExternalDNS from './external-dns';
import * as TraefikGateway from './traefik-gateway';
import * as Crossplane from './crossplane';

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

export async function setup(input: CoreAppliocationArgs): Promise<void> {
  if (input.externalDNS) {
    await ExternalDNS.setup({
      resourceGroupName: input.resourceGroupName,
      tenantId: input.externalDNS.tenantId,
      subscriptionId: input.subscriptionId,
      zoneData: input.externalDNS.zoneData,
      version: input.externalDNS.version,
      cluster: input.cluster,
      provider: input.provider,
    });
  }
  //
  if (input.traefikGateway) {
    await TraefikGateway.setup({
      version: input.traefikGateway.version,
      traefikVersion: input.traefikGateway.helmVersion,
      provider: input.provider,
      loadbalancerSubnetName: input.traefikGateway.loadbalancerSubnetName,
      hostname: input.traefikGateway.hostname,
      tls: input.traefikGateway.tls,
    });
  }
  //
  if (input.crossplane) {
    await Crossplane.setup({
      crossplaneVersion: input.crossplane.version,
      crossplaneHelmVersion: input.crossplane.helmVersion,
      provider: input.provider,
    });
  }
}
