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

describe('SplitHorizonResolver', function () {
  let SplitHorizonResolver: typeof import('./private-resolver');
  let NetworkCore: typeof import('../network/core');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    SplitHorizonResolver = await import('./private-resolver');
    NetworkCore = await import('../network/core');
  });

  describe('#resolver', function () {
    test('is defined', () => {
      expect(SplitHorizonResolver.resolver).toBeUndefined();
    });
  });

  describe('#inboundEndpoint', function () {
    test('is defined', () => {
      expect(SplitHorizonResolver.inboundEndpoint).toBeUndefined();
    });
  });

  describe('#setup', function () {
    let resourceGroup: azure_native.resources.ResourceGroup;
    let network: azure_native.network.VirtualNetwork;
    let subnet: azure_native.network.Subnet;
    let input: any;
    let subnets: Map<string, azure_native.network.SubnetArgs>;
    let snets: Map<string, azure_native.network.SubnetArgs>;
    beforeEach(async function () {
      resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
        resourceGroupName: 'rg-test',
      });
      network = NetworkCore.createNetwork(
        resourceGroup,
        'vnet-test',
        '10.0.0.0/20',
      );
      snets = new Map<string, SubnetArgs>();
      snets.set('dmz', {
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: network.name,
        addressPrefix: '10.0.0.0/24',
      });
      subnets = NetworkCore.createSubnets(snets);
      input = {
        resourceGroup,
        network,
        subnet,
      };
      subnet = subnets.get('dmz');
    });
    test('is defined', () => {
      expect(SplitHorizonResolver.setup).toBeTypeOf('function');
    });
    test('does not throw', () => {
      expect(
        async () => await SplitHorizonResolver.setup(input),
      ).to.not.throw();
    });
    test('has resolver after setup', async () => {
      await SplitHorizonResolver.setup(input);
      expect(SplitHorizonResolver.resolver).toBeInstanceOf(
        azure_native.network.DnsResolver,
      );
    });
    test('has inboundEndpoint after setup', async () => {
      await SplitHorizonResolver.setup(input);
      expect(SplitHorizonResolver.inboundEndpoint).toBeInstanceOf(
        azure_native.network.InboundEndpoint,
      );
    });
  });
});
