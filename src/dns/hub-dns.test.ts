import { expect, test, describe, beforeEach, afterEach } from 'vitest';
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

describe('HubDNS', function () {
  let HubDNS: typeof import('./hub-dns');
  let NetworkCore: typeof import('../network/core-network');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    HubDNS = await import('./hub-dns');
    NetworkCore = await import('../network/core-network');
  });
  afterEach(() => {
    HubDNS.zones.clear();
  });
  describe('#zones', function () {
    test('is defined', () => {
      expect(HubDNS.zones).toBeTypeOf('object');
    });
    test('is empty', () => {
      expect(HubDNS.zones.size).toBe(0);
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
      const location = 'northeurope';
      zones.set('aks', pulumi.interpolate`privatelink.${location}.azmk8s.io`);
      zones.set('app-domain', 'test.com');
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
      expect(HubDNS.setup).toBeTypeOf('function');
    });
    test('does not throw', () => {
      expect(async () => await HubDNS.setup(input)).to.not.throw();
    });
    test('has zones after setup', async () => {
      await HubDNS.setup(input);
      expect(HubDNS.zones.size).toBe(2);
      expect(HubDNS.zones.get('aks')).toBeInstanceOf(
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
      expect(HubDNS.createAddressEntry).toBeTypeOf('function');
    });
    test('creates a records', async () => {
      await HubDNS.setup(input);
      expect(
        HubDNS.createAddressEntry({
          name: 'test',
          ipAddress: '10.0.0.4',
          resourceGroup,
          dnsZone: HubDNS.zones.get('aks')!,
        }),
      ).toBeTruthy();
    });
  });

  describe('#outputs', function () {
    let resourceGroup: azure_native.resources.ResourceGroup;
    let zones: Map<string, pulumi.Output<string>>;
    let input: any;
    beforeEach(async function () {
      resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
        resourceGroupName: 'rg-test',
      });
      zones = new Map<string, string | pulumi.Output<string>>();
      zones.set('aks', 'privatelink.northeurope.azmk8s.io');
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
      expect(HubDNS.outputs).toBeTypeOf('function');
    });
    test('returns dns zone', async () => {
      await HubDNS.setup(input);
      const outputs = HubDNS.outputs();
      expect(outputs.dnsZones).toBeTypeOf('object');
      expect(outputs.dnsZones.length).toBe(1);
      expect(outputs.dnsZones[0].name).toBeInstanceOf(pulumi.Output);
      expect(outputs.dnsZones[0].resourceGroupName).toBeInstanceOf(
        pulumi.Output,
      );
    });
  });
});
