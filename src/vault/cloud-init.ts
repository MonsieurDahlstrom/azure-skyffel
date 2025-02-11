import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

type CloudConfigInput = {
  ipAddress: string;
  vaultFileStoragePath: string;
  keyVault: {
    tenantId: string;
    name: string;
    secret_name: string;
    client_id: string;
  };
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    hostname: string;
    staging: boolean;
  };
};

type CreateCloudInitCustomData = {
  ipAddress: pulumi.Output<string>;
  vaultFileStoragePath: string;
  keyVault: {
    tenantId: string;
    name: pulumi.Output<string>;
    secret_name: string;
    client_id: pulumi.Output<string>;
  };
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    hostname: string;
    staging: boolean;
  };
  kubernetes: {
    token: pulumi.Output<string>;
    server: pulumi.Output<string>;
    caCert: pulumi.Output<string>;
  };
};
export function createCloudInitCustomData(
  input: CreateCloudInitCustomData,
): pulumi.Output<string> {
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
      path: /opt/vault/aks_ca.pem
      content: ${input.kubernetes.caCert}
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
        export VAULT_ADDR="https://${input.tls.hostname}:8200"
        export VAULT_SKIP_VERIFY=${input.tls.staging ? 'true' : 'false'}
        vault secrets enable kubernetes
        vault write -f kubernetes/config service_account_jwt="${input.kubernetes.token}" kubernetes_host="${input.kubernetes.server}" kubernetes_ca_cert=@/opt/vault/aks_ca.pem
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
    - ./opt/vault/initialise_aks.sh
  `;
  return configuration.apply((cloudInit) =>
    Buffer.from(cloudInit).toString('base64'),
  );
}
/*
  https://medium.com/@czembower/recommended-patterns-for-vault-unseal-and-recovery-key-management-d6366a2f4607
  */
function GetCloudInitCustomData(input: CloudConfigInput): string {
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

function GetValue<T>(output: pulumi.Output<T>) {
  return new Promise<T>((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}
