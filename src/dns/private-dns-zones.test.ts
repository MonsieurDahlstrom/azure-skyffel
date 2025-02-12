import { expect, test, describe, beforeEach } from 'vitest';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      const { type, id, name } = args;
      switch (type) {
        case 'azure-native:network:PrivateZone': {
          let state = { ...args.inputs };
          state.name = state.privateZoneName;
          return {
            id: args.inputs.privateZoneName + '_id',
            state,
          };
        }
        case 'azure-native:resources:ResourceGroup': {
          let state = { ...args.inputs };
          state.name = state.resourceGroupName;
          return {
            id: args.inputs.resourceGroupName + '_id',
            state,
          };
        }
        default: {
          return {
            id: args.inputs.name + '_id',
            state: args.inputs,
          };
        }
      }
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
      return args.inputs;
    },
  },
  'project',
  'stack',
  false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
);

describe('SplitHorizonPrivateDNS', function () {
  let SplitHorizonPrivateDNS: typeof import('./private-dns-zones');
  let NetworkCore: typeof import('../network/core');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    SplitHorizonPrivateDNS = await import('./private-dns-zones');
    NetworkCore = await import('../network/core');
  });

  describe('#zones', function () {
    test('is defined', () => {
      expect(SplitHorizonPrivateDNS.zones).toBeTypeOf('object');
    });
    test('is empty', () => {
      expect(SplitHorizonPrivateDNS.zones.size).toBe(0);
    });
  });

  describe('#setup', function () {
    let resourceGroup: azure_native.resources.ResourceGroup;
    let zones: Map<string, pulumi.Output<string>>;
    let input: any;
    beforeEach(async function () {
      resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
        resourceGroupName: 'rg-test',
      });
      zones = new Map<string, pulumi.Output<string>>();
      zones.set('aks', pulumi.output('privatelink.northeurope.azmk8s.io'));
      NetworkCore.setupNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
      input = {
        resourceGroup,
        network: NetworkCore.virtualNetwork,
        zones,
        dnsZoneContributors: [],
        subscriptionId: '',
      };
    });
    test('is defined', () => {
      expect(SplitHorizonPrivateDNS.setup).toBeTypeOf('function');
    });
    test('does not throw', () => {
      expect(
        async () => await SplitHorizonPrivateDNS.setup(input),
      ).to.not.throw();
    });
    test('has zones after setup', async () => {
      await SplitHorizonPrivateDNS.setup(input);
      expect(SplitHorizonPrivateDNS.zones.size).toBe(1);
      expect(SplitHorizonPrivateDNS.zones.get('aks')).toBeInstanceOf(
        azure_native.network.PrivateZone,
      );
    });
  });

  describe('#createAddressEntry', function () {
    let resourceGroup: azure_native.resources.ResourceGroup;
    let zones: Map<string, pulumi.Output<string>>;
    let input: any;
    beforeEach(async function () {
      resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
        resourceGroupName: 'rg-test',
      });
      zones = new Map<string, pulumi.Output<string>>();
      zones.set('aks', pulumi.output('privatelink.northeurope.azmk8s.io'));
      NetworkCore.setupNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
      input = {
        resourceGroup,
        network: NetworkCore.virtualNetwork,
        zones,
        dnsZoneContributors: [],
        subscriptionId: '',
      };
    });
    test('is defined', () => {
      expect(SplitHorizonPrivateDNS.createAddressEntry).toBeTypeOf('function');
    });
    test('creates a records', async () => {
      await SplitHorizonPrivateDNS.setup(input);
      expect(
        SplitHorizonPrivateDNS.createAddressEntry({
          name: 'test',
          ipAddress: '10.0.0.4',
          resourceGroup,
          dnsZone: SplitHorizonPrivateDNS.zones.get('aks')!,
        }),
      ).toBeTruthy();
    });
  });
});
