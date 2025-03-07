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
exports.createCloudInitWithTLS = createCloudInitWithTLS;
const pulumi = __importStar(require('@pulumi/pulumi'));
/*
  https://medium.com/@czembower/recommended-patterns-for-vault-unseal-and-recovery-key-management-d6366a2f4607
  */
function createCloudInitWithTLS(input) {
  const configuration = pulumi.interpolate`
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
      path: /opt/vault/tls/vault_fullchain.pem
      content: ${input.tls.certificate}
      permissions: '0770'
      encoding: b64
    - owner: 'root:root'
      path: /opt/vault/tls/vault_privatekey.pem
      content: ${input.tls.key}
      permissions: '0770'
      encoding: b64
    - owner: "root:root"
      path: /opt/vault/aks_ca.pem
      content: ${input.kubernetes.caCert}
      permissions: '0770'
      defer: true
      encoding: b64
    - owner: "root:root"
      path: /opt/vault/vault_aks_token.jwt
      content: ${input.kubernetes.token}
      permissions: '0770'
      defer: true
      encoding: b64
    - owner: "root:root"
      path: /opt/vault/initialise_aks.sh
      permissions: '0770'
      defer: true
      content: |
        #!/bin/bash
        export VAULT_TOKEN=$(cat /tmp/vault-init.json | jq -r '.root_token')
        export VAULT_ADDR="https://${input.tls.fqdn}:8200"
        vault secrets enable kubernetes
        vault write -f kubernetes/config service_account_jwt=@/opt/vault/vault_aks_token.jwt kubernetes_host="${input.kubernetes.server}" kubernetes_ca_cert=@/opt/vault/aks_ca.pem
    - owner: "root:root"
      path: /opt/vault/initialise_vault.sh
      permissions: '0770'
      defer: true
      content: |
        #!/bin/bash
        az login --identity
        export VAULT_ADDR="https://${input.tls.fqdn}:8200"
        export VAULT_SKIP_VERIFY=true
        vault operator init -format json > /tmp/vault-init.json
        cat /tmp/vault-init.json | jq -r '.recovery_keys_b64 | to_entries[] | "az keyvault secret set --name recovery-keys-b64-\\(.key+1) --vault-name ${input.keyVault.name} --value \\(.value)"' |  xargs -n 1 -I {} bash -c "{}"
        cat /tmp/vault-init.json | jq -r '.root_token | "az keyvault secret set --name root-token --vault-name ${input.keyVault.name} --value \\(.)"' | xargs -n 1 -I {} bash -c "{}"
        systemctl stop vault.service
        systemctl start vault.service
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
    - chown -R vault:vault /opt/vault/tls
    - systemctl start vault.service
    - ./opt/vault/initialise_vault.sh
    - ./opt/vault/initialise_aks.sh
  `;
  return configuration.apply((cloudInit) =>
    Buffer.from(cloudInit).toString('base64'),
  );
}
//# sourceMappingURL=cloud-init-tls-certificate.js.map
