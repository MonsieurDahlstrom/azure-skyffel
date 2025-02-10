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
    describe('pre #setup', function () {
      test('setup is defined', function () {
        expect(Vault.setup).to.be.a('function');
      });
      test('expected properties defined', async function () {
        expect(Vault.virtualMachine).to.be.undefined;
        expect(Vault.networkInterface).to.be.undefined;
        expect(Vault.keyVault).to.be.undefined;
        expect(Vault.vaultIdentity).to.be.undefined;
      });
    });
    describe('post #setup', function () {
      let network: azure_native.network.Network;
      let subnetVault, subnetKV: azure_native.network.Subnet;
      let resourceGroup: azure_native.resources.ResourceGroup;
      let username: pulumi.Output<string>;
      let password: pulumi.Output<string>;
      let input: Vault.VaultInput;
      let tenantId: string;
      let subscriptionId: string;
      let admins: { principalId: string; type: string }[];
      let admin: { principalId: string; type: string };
      let dnsZone: azure_native.network.PrivateZone;

      beforeEach(async function () {
        resourceGroup = new azure_native.resources.ResourceGroup('rg-test', {
          resourceGroupName: 'rg-test',
        });
        dnsZone = new azure_native.network.PrivateZone('dns-zone-test', {
          location: 'Global',
          privateZoneName: 'monsieurdahlstrom.dev',
          resourceGroupName: resourceGroup.name,
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
        snets.set('subnet2', {
          addressPrefix: '10.0.0.1/25',
          virtualNetworkName: network.name,
          resourceGroupName: resourceGroup.name,
        });
        const subnets = NetworkCore.createSubnets(snets);
        subnetVault = subnets.get('subnet1');
        subnetKV = subnets.get('subnet2');
        admin = { principalId: uuidv4(), type: 'Group' };
        subscriptionId = uuidv4();
        tenantId = uuidv4();
        password = pulumi.interpolate('test_password');
        username = pulumi.interpolate('test_username');
        input = {
          admins: [admin],
          tls: {
            cloudflareApiToken: 'test_token',
            contactEmail: 'mathias@monsieurdahlstrom.com',
            fqdn: 'vault.monsieurdahlstrom.dev',
          },
          keyVault: {
            subnet: subnetKV,
            dnsZone,
          },
          resourceGroup,
          subnet: subnetVault,
          subscriptionId,
          tenantId,
          user: {
            password,
            username,
          },
          vmSize: 'standard_b2s',
        };
      });

      test('#virtualMachine is defined', async function () {
        await Vault.setup(input);
        expect(Vault.virtualMachine).to.be.a('object');
      });

      test('#networkInterface is defined', async function () {
        await Vault.setup(input);
        expect(Vault.networkInterface).to.be.a('object');
      });
      test('#keyVault is defined', async function () {
        await Vault.setup(input);
        expect(Vault.keyVault).to.be.a('object');
      });
      test('#vaultIdentity is defined', async function () {
        await Vault.setup(input);
        expect(Vault.vaultIdentity).to.be.a('object');
      });
      test('cloud-init', async function () {
        await Vault.setup(input);
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(
            `cloudflare_api_token = "${input.tls.cloudflareApiToken}"`,
          );
          expect(cloudInitConfig).toContain(`-d "${input.tls.fqdn}"`);
          expect(cloudInitConfig).toContain(`-m ${input.tls.contactEmail}`);
          expect(cloudInitConfig).toContain(
            `cat /tmp/vault-init.json | jq -r '.recovery_keys_b64 | to_entries[] | "az keyvault secret set --name recovery-keys-b64-\\(.key+1)`,
          );
          expect(cloudInitConfig).to.not.contain(`--staging`);
        });
      });
      test('cloud-init has staging tls certificate', async function () {
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
