import { expect, test, describe, beforeEach } from 'vitest';

import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      return {
        id: args.inputs.name + '_id',
        state: args.inputs,
      };
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  },
  'project',
  'stack',
  false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

describe('setupSubnets', () => {
  let NetworkCore: typeof import('./core');
  let resourceGroup: azure_native.resources.ResourceGroup;
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    NetworkCore = await import('./core-network');
    resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
      resourceGroupName: 'rg-test',
    });
    NetworkCore.setupNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
  });
  test('setupSubnets expected to be defined', () => {
    expect(NetworkCore.setupSubnets).toBeTypeOf('function');
  });
  test('setupSubnets creates snet without delegations', () => {
    const snets = new Map<string, NetworkCore.MDSubnetArgs>();
    snets.set('subnet1', {
      addressPrefix: '10.0.0.0/25',
      virtualNetworkName: NetworkCore.virtualNetwork.name,
      resourceGroupName: resourceGroup.name,
    });
    NetworkCore.setupSubnets(snets);
    expect(NetworkCore.subnets.size).toBe(1);
    NetworkCore.subnets.get('subnet1').delegations.apply((delegations) => {
      expect(delegations).toBeUndefined();
    });
  });
  test('setupSubnets creates snet with delegations', () => {
    const snets = new Map<string, NetworkCore.MDSubnetArgs>();
    snets.set('subnet1', {
      addressPrefix: '10.0.0.0/25',
      virtualNetworkName: NetworkCore.virtualNetwork.name,
      resourceGroupName: resourceGroup.name,
      delegationType: NetworkCore.MDSubbnetDelegation.GithubRunner,
    });
    NetworkCore.setupSubnets(snets);
    expect(NetworkCore.subnets.size).toBe(1);
    NetworkCore.subnets.get('subnet1').delegations.apply((delegations) => {
      expect(delegations.length).toBe(1);
    });
  });
});
