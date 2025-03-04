import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

const KyvernoHelmVersion = '3.3.7';
const KyvernoPoliciesHelmVersion = '3.3.4';

export type KyvernoArgs = {
  provider: k8s.Provider;
  kyvernoHelmVersion?: string;
  policiesHelmVersion?: string;
};

export let kyverno: k8s.helm.v3.Chart;
export let policies: k8s.helm.v3.Chart;

export async function setup(input: KyvernoArgs): Promise<void> {
  const ns = new k8s.core.v1.Namespace(
    'kyverno',
    {
      metadata: {
        name: 'kyverno',
      },
    },
    { provider: input.provider },
  );
  kyverno = new k8s.helm.v3.Chart(
    'kyverno',
    {
      namespace: ns.metadata.name,
      chart: 'kyverno',
      version: input.kyvernoHelmVersion
        ? input.kyvernoHelmVersion
        : KyvernoHelmVersion,
      fetchOpts: {
        repo: 'https://kyverno.github.io/kyverno/',
      },
      values: {},
    },
    { provider: input.provider },
  );
  policies = new k8s.helm.v3.Chart(
    'kyverno-policies',
    {
      namespace: ns.metadata.name,
      chart: 'kyverno-policies',
      version: input.policiesHelmVersion
        ? input.policiesHelmVersion
        : KyvernoPoliciesHelmVersion,
      fetchOpts: {
        repo: 'https://kyverno.github.io/kyverno/',
      },
      values: {},
    },
    { provider: input.provider },
  );
}
