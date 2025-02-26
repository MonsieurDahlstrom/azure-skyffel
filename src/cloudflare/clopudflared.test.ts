import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';

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
        case 'random:index/randomBytes:RandomBytes': {
          let state = { ...args.inputs };
          state.name = state.privateZoneName;
          state.result = Array(args.inputs.length + 1).reduce(
            (acc, _) => acc + Math.floor(Math.random() * (122 - 97 + 1)) + 97,
            '',
          );
          state.base64 = Buffer.from(state.result).toString('base64');
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

const networkLayout = {
  name: 'test',
  layout: {
    addressSpace: '10.0.0.0/20',
    subnets: [
      {
        name: 'dmz',
        addressPrefix: '10.0.0.0/28',
        delegationType: 'None',
      },
    ],
  },
};

describe('Cloudflared', () => {
  let Cloudflared: typeof import('./cloudflared');
  let AzureVnet: typeof import('../network/core-network');
  let resourceGroup: azure_native.resources.ResourceGroup;
  beforeEach(async () => {
    Cloudflared = await import('./cloudflared');
    AzureVnet = await import('../network/core-network');
    resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
      resourceGroupName: 'rg-test',
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    AzureVnet.reset();
  });

  describe('setup', () => {
    let input: Cloudflared.CloudflaredInput;
    beforeEach(async function () {
      AzureVnet.setup({ ...networkLayout, resourceGroup });
    });
    test('should create a cloudflared tunnel', async () => {
      input = {
        user: {
          username: 'test',
          password: pulumi.output('test'),
        },
        routeCidr: '10.0.0.0/20',
        ingresses: [],
        cloudflare: {
          account: 'test',
          zone: 'test',
        },
        subnetId: AzureVnet.subnets.get('dmz')!.id,
        resourceGroup,
        vmSize: 'Standard_B1s',
      };
      await Cloudflared.setup(input);
      expect(Cloudflared.virtualMachine).toBeDefined();
      expect(Cloudflared.networkInterface).toBeDefined();
    });
  });
});
