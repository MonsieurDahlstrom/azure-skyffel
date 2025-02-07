'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.vaultIdentity =
  exports.keyVault =
  exports.virtualMachine =
  exports.networkInterface =
    void 0;
exports.setup = setup;
// pulumi imports
const pulumi = __importStar(require('@pulumi/pulumi'));
//azure-native imports
const network_1 = require('@pulumi/azure-native/network');
const compute_1 = require('@pulumi/azure-native/compute');
const keyvault_1 = require('@pulumi/azure-native/keyvault');
const managedidentity_1 = require('@pulumi/azure-native/managedidentity');
const AzureRoles = __importStar(require('../rbac/roles'));
const KeyVault = __importStar(require('../kms/azure-key-vault'));
async function setup(input) {
  // Create an identity to run hashicorp vault as
  exports.vaultIdentity = new managedidentity_1.UserAssignedIdentity(
    `identity-vault`,
    {
      resourceGroupName: input.resourceGroup.name,
    },
  );
  //create a random azure key vault name suffix
  const KVTuple = await KeyVault.create({
    name: 'vault',
    resourceGroup: input.resourceGroup,
    subnet: input.keyVault.subnet,
    dnsZone: input.keyVault.dnsZone,
    readers: input.keyVault.readers,
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    officers: input.keyVault.officers,
    dataAccessManagers: input.keyVault.dataAccessManagers,
  });
  exports.keyVault = KVTuple[0];
  let assignments = [...KVTuple[1]];
  // add the vault identity to the key vault rbac
  exports.vaultIdentity.principalId.apply(async (principalId) => {
    assignments.push(
      AzureRoles.assignRole({
        principal: { id: principalId, type: 'UserAssignedIdentity' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultCryptoUser,
        scope: exports.keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
    assignments.push(
      AzureRoles.assignRole({
        principal: { id: principalId, type: 'UserAssignedIdentity' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultSecretOfficer,
        scope: exports.keyVault.id,
        key: 'vault-identity',
        subscriptionId: input.subscriptionId,
      }),
    );
  });
  const autoUnsealSecret = new keyvault_1.Key(
    'secret-vault-auto-unseal',
    {
      keyName: 'auto-unseal',
      resourceGroupName: input.resourceGroup.name,
      vaultName: exports.keyVault.name,
      properties: {
        kty: keyvault_1.JsonWebKeyType.RSA,
        keySize: 2048,
        keyOps: ['wrapKey', 'unwrapKey'],
      },
    },
    { dependsOn: assignments },
  );
  // NIC
  exports.networkInterface = new network_1.NetworkInterface('vault-nic', {
    resourceGroupName: input.resourceGroup.name,
    location: input.resourceGroup.location,
    enableIPForwarding: false,
    ipConfigurations: [
      {
        name: 'internal',
        subnet: {
          id: input.subnet.id,
        },
        privateIPAllocationMethod: 'Dynamic',
      },
    ],
  });
  //Retrive the ip address for the network interface
  const customData = await pulumi
    .all([
      exports.networkInterface.ipConfigurations,
      exports.keyVault.name,
      exports.vaultIdentity.clientId,
    ])
    .apply(async ([ipConfigurations, keyVaultName, vaultIdentityClientId]) => {
      if (
        ipConfigurations === undefined ||
        ipConfigurations[0] === undefined ||
        ipConfigurations[0].privateIPAddress === undefined
      ) {
        throw new Error('Network interface does not have an IP address');
      }
      if (keyVaultName === undefined) {
        throw new Error('Key vault name is undefined');
      }
      if (vaultIdentityClientId === undefined) {
        throw new Error('Vault identity client id is undefined');
      }
      return GetCloudInitCustomData({
        ipAddress: ipConfigurations[0].privateIPAddress,
        vaultFileStoragePath: '/opt/vault/data/',
        keyVault: {
          tenantId: input.tenantId,
          name: keyVaultName,
          secret_name: 'auto-unseal',
          client_id: vaultIdentityClientId,
        },
        tls: {
          contactEmail: input.tls.contactEmail,
          cloudflareApiToken: input.tls.cloudflareApiToken,
          hostname: input.tls.fqdn,
          staging: input.tls.isStaging,
        },
      });
    });
  // Create VM
  exports.virtualMachine = new compute_1.VirtualMachine(
    'vault-vm',
    {
      vmName: 'vault',
      hardwareProfile: {
        vmSize: input.vmSize,
      },
      diagnosticsProfile: {
        bootDiagnostics: {
          enabled: true,
        },
      },
      resourceGroupName: input.resourceGroup.name,
      location: input.resourceGroup.location,
      networkProfile: {
        networkInterfaces: [
          {
            id: exports.networkInterface.id,
          },
        ],
      },
      osProfile: {
        adminUsername: input.user.username,
        adminPassword: input.user.password,
        computerName: 'vault',
        customData,
        linuxConfiguration: {
          patchSettings: {
            patchMode: compute_1.LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: compute_1.SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      identity: {
        type: 'UserAssigned',
        userAssignedIdentities: [exports.vaultIdentity.id],
      },
      storageProfile: {
        osDisk: {
          caching: compute_1.CachingTypes.ReadWrite,
          createOption: compute_1.DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType: compute_1.StorageAccountTypes.Standard_LRS,
          },
          name: 'vault-osdisk',
        },
        imageReference: {
          publisher: 'Canonical',
          offer: 'ubuntu-24_04-lts',
          sku: 'server',
          version: 'latest',
        },
      },
    },
    {
      dependsOn: [
        exports.networkInterface,
        input.subnet,
        exports.keyVault,
        autoUnsealSecret,
      ],
      replaceOnChanges: ['osProfile'],
    },
  );
  return true;
}
/*
https://medium.com/@czembower/recommended-patterns-for-vault-unseal-and-recovery-key-management-d6366a2f4607
*/
function GetCloudInitCustomData(input) {
  const cloudInitConfig = `
#cloud-config
apt:
  sources:
    cloudflare:
      source: deb [arch="amd64"] https://apt.releases.hashicorp.com/ $RELEASE main
      keyid: 798AEC654E5C15428C8E42EEAA16FCBCA621E701
      keyserver: 'https://apt.releases.hashicorp.com/gpg'
    azure:
      source: deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $RELEASE main
      keyid: BC528686B50D79E339D3721CEB3E94ADBE1229CF
      keyserver: 'https://packages.microsoft.com/keys/microsoft.asc'
package_update: true
packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release
  - vault
  - azure-cli
write_files:
  - owner: 'root:root'
    path: /opt/vault/certbot/cloudflare.ini
    content: |
      dns_cloudflare_api_token = "${input.tls.cloudflareApiToken}"
    permissions: '600'
    defer: true
  - owner: "root:root"
    path: /etc/letsencrypt/renewal-hooks/pre/vault.sh
    content: |
      #!/bin/bash
      systemctl stop vault.service
  - owner: "root:root"
    path: /opt/vault/initialise_vault.sh
    permissions: '0770'
    defer: true
    content: |
      #!/bin/bash
      az login --identity
      export VAULT_ADDR="https://${input.tls.hostname}:8200"
      export VAULT_SKIP_VERIFY=true
      vault operator init -format json > /tmp/vault-init.json
      cat /tmp/vault-init.json | jq -r '.recovery_keys_b64 | to_entries[] | "az keyvault secret set --name recovery-keys-b64-\\(.key+1) --vault-name ${input.keyVault.name} --value \\(.value)"' |  xargs -n 1 -I {} bash -c "{}"
      cat /tmp/vault-init.json | jq -r '.root_token | "az keyvault secret set --name root-token --vault-name ${input.keyVault.name} --value \\(.)"' | xargs -n 1 -I {} bash -c "{}"
      rm /tmp/vault-init.json
      systemctl stop vault.service
      systemctl start vault.service
  - owner: "root:root"
    path: /etc/letsencrypt/renewal-hooks/post/vault.sh
    content: |
      #!/bin/bash
      cp /etc/letsencrypt/live/${input.tls.hostname}/fullchain.pem /opt/vault/tls/vault_fullchain.pem
      cp /etc/letsencrypt/live/${input.tls.hostname}/privkey.pem /opt/vault/tls/vault_privatekey.pem
      chown -R vault:vault /opt/vault/tls
      systemctl start vault.service
    permissions: '0770'
    defer: true
  - owner: 'root:vault'
    path: /etc/vault.d/vault.hcl
    content: |
      ui            = true
      cluster_addr  = "https://${input.ipAddress}:8201"
      api_addr      = "https://${input.ipAddress}:8200"
      disable_mlock = true
      storage "file" {
        path = "${input.vaultFileStoragePath}"
      }
      listener "tcp" {
        address       = "${input.ipAddress}:8200"
        tls_cert_file = "/opt/vault/tls/vault_fullchain.pem"
        tls_key_file  = "/opt/vault/tls/vault_privatekey.pem"
      }
      seal "azurekeyvault" {
        tenantId  = "${input.keyVault.tenantId}"
        vault_name = "${input.keyVault.name}"
        key_name   = "${input.keyVault.secret_name}"
        client_id  = "${input.keyVault.client_id}"
      }
    permissions: '0644'
    defer: true
runcmd:
  - snap install --classic certbot
  - ln -s /snap/bin/certbot /usr/bin/certbot
  - snap set certbot trust-plugin-with-root=ok
  - snap install certbot-dns-cloudflare
  - sudo systemctl enable vault.service
  - certbot certonly -m ${input.tls.contactEmail} --agree-tos --non-interactive --dns-cloudflare --dns-cloudflare-credentials /opt/vault/certbot/cloudflare.ini -d "${input.tls.hostname}" --dns-cloudflare-propagation-seconds 20 ${input.tls.staging ? '--staging' : ''}
  - cp /etc/letsencrypt/live/${input.tls.hostname}/fullchain.pem /opt/vault/tls/vault_fullchain.pem
  - cp /etc/letsencrypt/live/${input.tls.hostname}/privkey.pem /opt/vault/tls/vault_privatekey.pem
  - chown -R vault:vault /opt/vault/tls
  - systemctl start vault.service
  - ./opt/vault/initialise_vault.sh
`;
  return Buffer.from(cloudInitConfig).toString('base64');
}
function GetValue(output) {
  return new Promise((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}
//# sourceMappingURL=index.js.map
