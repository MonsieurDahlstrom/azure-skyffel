import { expect, test, describe, beforeEach } from 'vitest';
import { cidrHost, cidrSubnet } from './core';
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

describe('cidrHost', () => {
  test('cidrHost expected host with number', () => {
    expect(cidrHost('10.0.0.0/16', 4)).toBe('10.0.0.4');
  });
  test('cidrHost expected host with string', () => {
    expect(cidrHost('10.0.0.0/16', '4')).toBe('10.0.0.4');
  });
});

describe('cidrSubnet', () => {
  test('cidrSubnet expected host with number', () => {
    expect(cidrSubnet('10.0.0.0/16', 1, 0)).toBe('10.0.0.0/17');
  });
  test('cidrSubnet expected host with number', () => {
    expect(cidrSubnet('10.0.0.0/16', 4, 0)).toBe('10.0.0.0/20');
  });
  test('cidrSubnet expected to error', () => {
    expect(() => cidrSubnet('10.0.0.0/16', 17, 0)).toThrowError(
      /equested 17 new bits, but only 16 are available/,
    );
  });
  test('cidrSubnet expected host with string', () => {
    expect(cidrSubnet('10.0.0.0/16', 1, 1)).toBe('10.0.128.0/17');
  });
});

describe('createSubnets', () => {
  let NetworkCore: typeof import('./core');
  let vnet: azure_native.network.VirtualNetwork;
  let resourceGroup: azure_native.resources.ResourceGroup;
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    NetworkCore = await import('./core');
    resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
      resourceGroupName: 'rg-test',
    });
    vnet = NetworkCore.createNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
  });
  test('createSubnets expected to be defined', () => {
    expect(NetworkCore.createSubnets).toBeTypeOf('function');
  });
  test('createSubnets creates snet without delegations', () => {
    const snets = new Map<string, NetworkCore.MDSubnetArgs>();
    snets.set('subnet1', {
      addressPrefix: '10.0.0.0/25',
      virtualNetworkName: vnet.name,
      resourceGroupName: resourceGroup.name,
    });
    const subnets = NetworkCore.createSubnets(snets);
    expect(subnets.size).toBe(1);
    subnets.get('subnet1').delegations.apply((delegations) => {
      expect(delegations).toBeUndefined();
    });
  });
  test('createSubnets creates snet with delegations', () => {
    const snets = new Map<string, NetworkCore.MDSubnetArgs>();
    snets.set('subnet1', {
      addressPrefix: '10.0.0.0/25',
      virtualNetworkName: vnet.name,
      resourceGroupName: resourceGroup.name,
      delegationType: NetworkCore.MDSubbnetDelegation.GithubRunner,
    });
    const subnets = NetworkCore.createSubnets(snets);
    expect(subnets.size).toBe(1);
    subnets.get('subnet1').delegations.apply((delegations) => {
      expect(delegations.length).toBe(1);
    });
  });
});
