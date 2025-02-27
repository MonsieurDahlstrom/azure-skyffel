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

describe('HubDNSResolver', function () {
  let HubDNSResolver: typeof import('./hub-dns-resolver');
  let NetworkCore: typeof import('../network/core-network');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    HubDNSResolver = await import('./hub-dns-resolver');
    NetworkCore = await import('../network/core-network');
  });

  describe('#resolver', function () {
    test('is defined', () => {
      expect(HubDNSResolver.resolver).toBeUndefined();
    });
  });

  describe('#inboundEndpoint', function () {
    test('is defined', () => {
      expect(HubDNSResolver.inboundEndpoint).toBeUndefined();
    });
  });

  describe('#setup', function () {
    let resourceGroup: azure_native.resources.ResourceGroup;
    let subnet: azure_native.network.Subnet;
    let input: any;
    let snets: Map<string, azure_native.network.SubnetArgs>;
    beforeEach(async function () {
      resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
        resourceGroupName: 'rg-test',
      });
      NetworkCore.setupNetwork(resourceGroup, 'vnet-test', '10.0.0.0/20');
      snets = new Map<string, SubnetArgs>();
      snets.set('dmz', {
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: NetworkCore.virtualNetwork.name,
        addressPrefix: '10.0.0.0/24',
      });
      NetworkCore.setupSubnets(snets);
      input = {
        resourceGroup,
        network: NetworkCore.virtualNetwork,
        subnet,
      };
      subnet = NetworkCore.subnets.get('dmz');
    });
    test('is defined', () => {
      expect(HubDNSResolver.setup).toBeTypeOf('function');
    });
    test('does not throw', () => {
      expect(async () => await HubDNSResolver.setup(input)).to.not.throw();
    });
    test('has resolver after setup', async () => {
      await HubDNSResolver.setup(input);
      expect(HubDNSResolver.resolver).toBeInstanceOf(
        azure_native.network.DnsResolver,
      );
    });
    test('has inboundEndpoint after setup', async () => {
      await HubDNSResolver.setup(input);
      expect(HubDNSResolver.inboundEndpoint).toBeInstanceOf(
        azure_native.network.InboundEndpoint,
      );
    });
    test('has output after setup', async () => {
      await HubDNSResolver.setup(input);
      expect(HubDNSResolver.outputs).toBeTypeOf('function');
      const outputs = HubDNSResolver.outputs();
      expect(outputs).toHaveProperty('dnsResolverIp');
      expect(outputs.dnsResolverIp).toBeInstanceOf(pulumi.Output);
    });
  });
});
