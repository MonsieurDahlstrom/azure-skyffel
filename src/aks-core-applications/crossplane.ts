import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as kubernetes from '@pulumi/kubernetes';

export let chart: kubernetes.helm.v3.Chart;

const crossplaneHelmVersion = '1.19.0';

export type CrossPlaneArgs = {
  crossplaneHelmVersion?: string;
  provider: kubernetes.Provider;
};

export function setup(input: CrossPlaneArgs): void {
  const ns = new kubernetes.core.v1.Namespace(
    'crossplane',
    {
      metadata: {
        name: 'crossplane-system',
      },
    },
    { provider: input.provider },
  );
  //
  chart = new k8s.helm.v3.Chart(
    'crossplane',
    {
      repo: 'crossplane-stable',
      chart: 'crossplane',
      version: input.crossplaneHelmVersion
        ? input.crossplaneHelmVersion
        : crossplaneHelmVersion,
      namespace: ns.metadata.name,
      fetchOpts: {
        repo: 'https://charts.crossplane.io/stable',
      },
      values: {},
    },
    { provider: input.provider },
  );
}
