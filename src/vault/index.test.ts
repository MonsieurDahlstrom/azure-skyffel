import { expect, test, describe, beforeEach, failed } from 'vitest';
import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import * as fs from 'fs';
import * as path from 'path';
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
      let kubeconfig: pulumi.Output<string>;

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
        const kubeconfigString = fs
          .readFileSync(path.resolve(__dirname, 'kubeconfig.test.yaml'))
          .toString();
        kubeconfig = pulumi.Output.create(kubeconfigString);
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
          kubeconfig,
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
      test('cloud-init has certbot configuration', async function () {
        await Vault.setup(input);
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(
            `cloudflare_api_token = "${input.tls.cloudflareApiToken}"`,
          );
          expect(cloudInitConfig).toContain(`-d "${input.tls.fqdn}"`);
          expect(cloudInitConfig).toContain(`-m ${input.tls.contactEmail}`);
          expect(cloudInitConfig).to.not.contain(`--staging`);
        });
      });
      test('cloud-init script that initalises and stores keys', async function () {
        await Vault.setup(input);
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(
            `cat /tmp/vault-init.json | jq -r '.recovery_keys_b64 | to_entries[] | "az keyvault secret set --name recovery-keys-b64-\\(.key+1)`,
          );
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
      test('cloud-init has kubernetes configuration', async function () {
        input.tls.isStaging = true;
        await Vault.setup(input);
        Vault.virtualMachine.osProfile.customData.apply((customData) => {
          let cloudInitConfig = Buffer.from(customData, 'base64').toString();
          expect(cloudInitConfig).toContain(`vault secrets enable kubernetes`);
          expect(cloudInitConfig).toContain(`vault write -f kubernetes/config`);
          expect(cloudInitConfig).toContain(
            `kubernetes_ca_cert="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUU2VENDQXRHZ0F3SUJBZ0lSQU9VSVZRWklBM1lxSmF0ZTNILzhUMWt3RFFZSktvWklodmNOQVFFTEJRQXcKRFRFTE1Ba0dBMVVFQXhNQ1kyRXdJQmNOTWpVd01URTFNVEF5TXpNMldoZ1BNakExTlRBeE1UVXhNRE16TXpaYQpNQTB4Q3pBSkJnTlZCQU1UQW1OaE1JSUNJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBZzhBTUlJQ0NnS0NBZ0VBCm5semRBTTlkMWM1bE5FQ2hFZDZ3Z3VhUzdQdTQweGRhWFo1ZllOeDhVUFdjdHhzWCtNUXVSbkwxTHZNNW1IVDgKNDd1Tm9NcXM4OVJqc3NyRnRaQnlUL1ZXNms4akxZYjNDaks3VGw5dmtIenlLK3l3aFFOVzBMTURpa3ZUVVJnNQo0VlFaWE5iQ0lyc3pOSU12S2lBNUVnZ3g5N29Sc2oyZDNCbUwvZ1V1M2trb2VrR1l1YWszS3NqalE5QkFlSDh0Cm42VDBnVU5nNytXcUNLd0g3RmFXWXdtRmFza3lMa2oyMjJTU3hzMkIrdzAxUkozb2RlK2hFeU8wU2pTRVpDemoKTytqcDJHK1FRNDRtQXBBUExIem5jMG5ia0VuN3Z1VTZ1cnByMWRiM0JNRXNIalMvM1hNd2txUFlNRURKVUNDawpkY3BTZ25mMDBibHFqYlRKV09QU0o4MnFtODJiMTJGeWhGUzdSdGhyRm9ZY3ozcVBUQ25lZUJzUi8zL2Yxa3BqCm5YQk1zUUpydzJoRjhOek1TTkFQMjdkT2ZUMlc3UUZ6ZWdWc1kwQ0Z5OXN0NElvRFhqZUdZS2RYNlQ2T0twTDAKUTYzSnFDRUJtK2pKOWpSK09wZ0czV0pXOTRnQytKR1VMbHJvNHpuUUtKUTcrT3BORnNPOU5SR25SL2F4MmYwQgo2ZzYxTDdWUW1aT0dZVXQxTmloekR5bmE3TnNjbHJCZmlHOWMvQVJ1OUdVbFVBVFkyL01kR3NWR1JFM044eUZQCnlKbmNsTk5UWFl2OWZQRFRhWERxVTIxdzFKZEZIVHpybHAzQ1JNREMzTGloMkE4UWlXQk9hUDJqU1h6V1FhRzcKSlpjR05HQWNlcFVoQXk3VkFObEtqemJpOVBoZWEvZGRCZnZJamFmbmRJOENBd0VBQWFOQ01FQXdEZ1lEVlIwUApBUUgvQkFRREFnS2tNQThHQTFVZEV3RUIvd1FGTUFNQkFmOHdIUVlEVlIwT0JCWUVGRHdlc2lSUERHL2sxTDJzCmZ0TXdST1hIUDJqZk1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQ0FRQ1orbE9lL1lHdC9pSUVudEdFTE1YZ1dUa0sKNzNLTzJoZzlWVjcxM2FKbWVnNFV6M2tEamF4U2pmN1pTWndPTmdsaTBVOVBoZlRLRnBMYUk0ZlNMV1V2eDJRQQpTSW5PUVI1TWlQWGRFNjcvNkZpOW56dDRTdUJwbTNPSkFHRTRjWHpRMXR4NzE2WDF2aTJLa2JKS0tBVHBheDFGClU0Q1pEVWZ3OS95T29rK0FnNlJubkw0aU5nZWdZWmdQT3poSGVHOVBpNUkxZ0dPbW5lRy93eGV3Z09wR3p2V3EKNGFKN252Ri84cUFMeCttL0hSQXEzSHM1eW9uS0pDKzFJTStOMUJPWkxkckVnS2gvTzU0SUNxSk1rZGJzWG16OAp1NzJuMUNmV1k1N3NXRVF1YVJubnV5d1JDd1pyYkNtaWtLRk5yZTM2dHFyVnNZZDNDVGJUUlJ6SWNFaWJRS1hXCk5lRDBtSGRHeFpVUzNLeEpDQTdqYzgzU21rYjhSZ0RTTlloVE1zQTZ3aDJmeDFmclY0dWcxbmpteEhDVWhDdzgKSlY3TUZIVGZGTWpDZWhFdVBPN1QwUWZKbU9JSS9BR2NLWURuWE5lcFM1MWxwN2hxdG00Z0Y4b3UraEh2a0ZkTwpBQnl5NEZiM1ZnQklpdkJ3aHMyZk82Vno5NkNub1JLWG43UVF6QjlSZE5vT21WWjN2MWhMMUR3eDBXR3oyMWxtClUxMFhFUVpubWsvRDBDWTAwMVRlZTFwbUU5aGpQd0RiL0cxTGtQbWpWTUlJcFNPY0liUVRMOVA1N2dEU3BEQnQKa3RwQlhlR0VpRkp6YkhQL3R1Sk12d204cmdxaWFtdkVSaXdLb0twYnlJWWUrWDdETDZpOXg2b2RvMll5anVOYwpHN2FxRWFyN2VGTnVjeXNWNUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=="`,
          );
          expect(cloudInitConfig).toContain(
            `kubernetes_host="https://aks-development-2btnrxnr.privatelink.swedencentral.azmk8s.io:443"`,
          );
        });
      });
    });
  });
});
