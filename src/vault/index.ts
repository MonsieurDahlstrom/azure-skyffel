// pulumi imports
import * as pulumi from '@pulumi/pulumi';
import { RandomString } from '@pulumi/random';

//azure-native imports
import {
  VirtualNetwork,
  Subnet,
  NetworkInterface,
} from '@pulumi/azure-native/network';
import {
  VirtualMachine,
  LinuxVMGuestPatchMode,
  SecurityTypes,
  CachingTypes,
  DiskCreateOptionTypes,
  StorageAccountTypes,
} from '@pulumi/azure-native/compute';
import { PrivateZone } from '@pulumi/azure-native/network';
import { ResourceGroup } from '@pulumi/azure-native/resources';
import { Vault, Key, JsonWebKeyType } from '@pulumi/azure-native/keyvault';
import { UserAssignedIdentity } from '@pulumi/azure-native/managedidentity';
import { RoleAssignment } from '@pulumi/azure-native/authorization';
import * as AzureRoles from '../rbac/roles';

export type VaultInput = {
  subnet: Subnet;
  resourceGroup: ResourceGroup;
  user: {
    username: string;
    password: pulumi.Output<string>;
  };
  vmSize: string;
  tenantId: string;
  admins: { principalId: string; type: string }[];
  subscriptionId: string;
  tls: {
    contactEmail: string;
    cloudflareApiToken: string;
    fqdn: string;
  };
};
export let networkInterface: NetworkInterface;
export let virtualMachine: VirtualMachine;
export let keyVault: Vault;
export let vaultIdentity: UserAssignedIdentity;

export async function setup(input: VaultInput): Promise<boolean> {
  // Create an identity to run hashicorp vault as
  vaultIdentity = new UserAssignedIdentity(`identity-vault`, {
    resourceGroupName: input.resourceGroup.name,
  });
  //create a random azure key vault name suffix
  const randomKeyVaultName = new RandomString('vault-name', {
    length: 10,
    special: false,
    lower: true,
    upper: false,
  });
  //Create a keyault to keep the unsealed key for the hashicorp vault
  keyVault = new Vault('vault-nic', {
    vaultName: randomKeyVaultName.result.apply((name) => `kv-vault-${name}`),
    location: input.resourceGroup.location,
    resourceGroupName: input.resourceGroup.name,
    properties: {
      enableRbacAuthorization: true,
      sku: {
        family: 'A',
        name: 'standard',
      },
      tenantId: input.tenantId,
    },
  });
  const adminRoleAssignments: RoleAssignment[] = [];
  await input.admins.forEach(async (admin) => {
    let assignment = await AzureRoles.assignKeyVaultOfficers({
      principal: { id: admin.principalId, type: admin.type },
      keyVault,
      subscriptionId: input.subscriptionId,
    });
    adminRoleAssignments.concat(assignment);
  });

  pulumi
    .all([keyVault.id, keyVault.name, vaultIdentity.principalId])
    .apply(async ([keyVaultId, keyVaultName, vaultIdentityClientId]) => {
      const assignment1 = AzureRoles.assignRole({
        principal: { id: vaultIdentityClientId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultSecretsUser,
        scope: keyVaultId,
        key: keyVaultName,
        subscriptionId: input.subscriptionId,
      });
      const assignment2 = AzureRoles.assignRole({
        principal: { id: vaultIdentityClientId, type: 'ServicePrincipal' },
        rbacRole: AzureRoles.RoleUUID.KeyVaultCryptoUser,
        scope: keyVaultId,
        key: keyVaultName,
        subscriptionId: input.subscriptionId,
      });
      adminRoleAssignments.concat([assignment1, assignment2]);
    });
  const autoUnsealSecret = new Key(
    'secret-vault-auto-unseal',
    {
      keyName: 'auto-unseal',
      resourceGroupName: input.resourceGroup.name,
      vaultName: keyVault.name,
      properties: {
        kty: JsonWebKeyType.RSA,
        keySize: 2048,
        keyOps: ['wrapKey', 'unwrapKey'],
      },
    },
    { dependsOn: adminRoleAssignments },
  );
  // NIC
  networkInterface = new NetworkInterface('vault-nic', {
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
      networkInterface.ipConfigurations,
      keyVault.name,
      vaultIdentity.clientId,
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
        ipAddress: ipConfigurations[0].privateIPAddress!,
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
        },
      });
    });
  // Create VM
  virtualMachine = new VirtualMachine(
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
            id: networkInterface.id,
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
            patchMode: LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      identity: {
        type: 'UserAssigned',
        userAssignedIdentities: [vaultIdentity.id],
      },
      storageProfile: {
        osDisk: {
          caching: CachingTypes.ReadWrite,
          createOption: DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType: StorageAccountTypes.Standard_LRS,
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
      dependsOn: [networkInterface, input.subnet, keyVault, autoUnsealSecret],
      replaceOnChanges: ['osProfile'],
    },
  );
  return true;
}

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
  };
};

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
      vault operator init -format json -key-shares=5 -key-threshold=3 > /tmp/vault-init.json
      cat /tmp/vault-init.json | jq -r '.unseal_keys_b64 | to_entries[] | "az keyvault secret set --name unseal-keys-b64-\(.key+1) --vault-name ${input.keyVault.name} --value \(.value)"' |  xargs -n 1 -I {} bash -c "{}"
      cat /tmp/vault-init.json | jq -r '.root_token | "az keyvault secret set --name root-token --vault-name ${input.keyVault.name} --value \(.)"' | xargs -n 1 -I {} bash -c "{}"
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
  - certbot certonly -m ${input.tls.contactEmail} --agree-tos --non-interactive --dns-cloudflare --dns-cloudflare-credentials /opt/vault/certbot/cloudflare.ini -d "${input.tls.hostname}" --dns-cloudflare-propagation-seconds 20
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
