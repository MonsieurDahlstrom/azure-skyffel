import { expect, test, describe, beforeEach, failed } from 'vitest';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import { v4 as uuidv4 } from 'uuid';

pulumi.runtime.setMocks(
  {
    newResource: function (args: pulumi.runtime.MockResourceArgs): {
      id: string;
      state: any;
    } {
      const { type, id, name } = args;
      switch (type) {
        case 'azure-native:keyvault:Vault': {
          let state = { ...args.inputs };
          state.name = state.vaultName;
          return {
            id: args.inputs.vaultName + '_id',
            state,
          };
        }
        case 'azure-native:managedidentity:UserAssignedIdentity': {
          let state = { ...args.inputs };
          state.clientId = uuidv4();
          state.principalId = uuidv4();
          return {
            id: args.inputs.name + '_id',
            state,
          };
        }
        case 'azure-native:network:NetworkInterface': {
          let state = { ...args.inputs };
          state.ipConfigurations[0].privateIPAddress = '10.0.4.5';
          return {
            id: args.inputs.name + '_id',
            state,
          };
        }
        default:
          return {
            id: args.inputs.name + '_id',
            state: args.inputs,
          };
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

describe('Vault', function () {
  let Vault: typeof import('./index');
  let NetworkCore: typeof import('../network/core');
  beforeEach(async function () {
    // It's important to import the program _after_ the mocks are defined.
    Vault = await import('./index');
    NetworkCore = await import('../network/core');
  });

  describe('Vault module', function () {
    describe('before #setup', function () {
      test('setup is defined', function () {
        expect(Vault.setup).toBeDefined();
      });
      test('#virtualMachine is not defined', function () {
        expect(Vault.virtualMachine).toBeUndefined();
      });
      test('#networkInterface is undefined', function () {
        expect(Vault.networkInterface).toBeUndefined();
      });
      test('#keyVault is defined', function () {
        expect(Vault.keyVault).toBeUndefined();
      });
      test('#vaultIdentity is defined', function () {
        expect(Vault.vaultIdentity).toBeUndefined();
      });
    });

    describe('post #setup', function () {
      let network: azure_native.network.Network;
      let subnet: azure_native.network.Subnet;
      let resourceGroup: azure_native.resources.ResourceGroup;
      let password: pulumi.Output<string>;
      let input: Vault.VaultInput;
      let tenantId: string;
      let subscriptionId: string;
      let admins: { principalId: string; type: string }[];
      let admin: { principalId: string; type: string };
      beforeEach(async function () {
        resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
          resourceGroupName: 'rg-test',
        });
        network = NetworkCore.createNetwork(
          resourceGroup,
          'vnet-test',
          '10.0.0.0/20',
        );
        const snets = new Map<string, NetworkCore.MDSubnetArgs>();
        snets.set('subnet1', {
          addressPrefix: '10.0.0.0/25',
          virtualNetworkName: network.name,
          resourceGroupName: resourceGroup.name,
        });
        const subnets = NetworkCore.createSubnets(snets);
        subnet = subnets.get('subnet1');
        admin = { principalId: uuidv4(), type: 'Group' };
        subscriptionId = uuidv4();
        tenantId = uuidv4();
        input = {
          admins: [admin],
          tls: {
            cloudflareApiToken: 'test_token',
            contactEmail: 'mathias@monsieurdahlstrom.com',
            fqdn: 'vault.monsieurdahlstrom.dev',
          },
          resourceGroup,
          subnet,
          subscriptionId,
          tenantId,
          user: {
            password: pulumi.interpolate`dummy_test_password`,
            username: 'testuser',
          },
          vmSize: 'standard_b2s',
        };
      });
      test('#virtualMachine is defined', async function () {
        await Vault.setup(input);
        expect(Vault.virtualMachine).toBeDefined();
      });
      test('#networkInterface is defined', function () {
        expect(Vault.networkInterface).toBeDefined();
      });
      test('#keyVault is defined', function () {
        expect(Vault.keyVault).toBeDefined();
      });
      test('#vaultIdentity is defined', function () {
        expect(Vault.vaultIdentity).toBeDefined();
      });
      test('cloud-init', function () {
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(
            `cloudflare_api_token = "${input.tls.cloudflareApiToken}"`,
          );
          expect(cloudInitConfig).toContain(`-d "${input.tls.fqdn}"`);
          expect(cloudInitConfig).toContain(`-m ${input.tls.contactEmail}`);
          expect(cloudInitConfig).toContain(
            `cat /tmp/vault-init.json | jq -r '.unseal_keys_b64 | to_entries[] | "az keyvault secret set --name unseal-keys-b64-\\(.key+1)`,
          );
          expect(cloudInitConfig).to.not.contain(`--staging`);
        });
      });
      test('cloud-init has staging se', async function () {
        input.tls.isStaging = true;
        await Vault.setup(input);
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(`--staging`);
        });
      });
    });
  });
});
