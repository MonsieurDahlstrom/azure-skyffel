import { expect, test, describe, beforeEach, afterEach } from 'vitest';

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

describe('AzureVnet', () => {
  let NetworkCore: typeof import('./core');
  let resourceGroup: azure_native.resources.ResourceGroup;
  beforeEach(async () => {
    NetworkCore = await import('./core-network');
    resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
      resourceGroupName: 'rg-test',
    });
  });
  afterEach(() => {
    NetworkCore.reset();
  });

  describe('setup', () => {
    let input: NetworkCore.Layout;
    beforeEach(async function () {
      // It's important to import the program _after_ the mocks are defined.
      input = {
        name: 'development',
        resourceGroup,
        layout: {
          cidr: '10.0.0.0/20',
          subnets: [
            {
              name: 'dmz',
              cidr: '10.0.0.0/27',
              delegationType: 'None',
            },
            {
              name: 'kubernetes-loadbalancers',
              cidr: '10.0.0.32/27',
              delegationType: 'None',
            },
            {
              name: 'virtual-machines',
              cidr: '10.0.0.64/26',
              delegationType: 'None',
            },
            {
              name: 'private-endpoints',
              cidr: '10.0.0.128/26',
              delegationType: 'None',
            },
            {
              name: 'kubernetes-nodes',
              cidr: '10.0.1.0/24',
              delegationType: 'None',
            },
          ],
        },
      };
    });
    test('setup expected to be defined', () => {
      expect(NetworkCore.setup).toBeTypeOf('function');
    });
    test('runs', async () => {
      await NetworkCore.setup(input);
      expect(NetworkCore.virtualNetwork).toBeDefined();
      expect(NetworkCore.subnets.size).toBe(5);
    });
  });

  describe('setupSubnets', () => {
    beforeEach(async function () {
      // It's important to import the program _after_ the mocks are defined.
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
        delegationType: NetworkCore.Delegation.GithubRunner,
      });
      NetworkCore.setupSubnets(snets);
      expect(NetworkCore.subnets.size).toBe(1);
      NetworkCore.subnets.get('subnet1').delegations.apply((delegations) => {
        expect(delegations.length).toBe(1);
      });
    });
  });
});
