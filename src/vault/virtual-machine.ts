import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
import { createCloudInitCustomData } from './cloud-init';
import * as Kubernetes from './kubernetes-vault-setup';
import { parse as parseYaml } from 'yaml';

type CreateVirtualMachine = {
  keyVault: azure_native.keyvault.Vault;
  resourceGroup: azure_native.resources.ResourceGroup;
  subnet: azure_native.network.Subnet;
  tenantId: string;
  tls: {
    cloudflareApiToken: string;
    contactEmail: string;
    fqdn: string;
    isStaging: boolean;
  };
  user: {
    password: pulumi.Output<string>;
    username: pulumi.Output<string>;
  };
  vaultIdentity: azure_native.managedidentity.UserAssignedIdentity;
  vmSize: string;
  kubeconfig: string;
};
export async function createVirtualMachine(
  input: CreateVirtualMachine,
): Promise<
  [azure_native.compute.VirtualMachine, azure_native.network.NetworkInterface]
> {
  // Install kubernetes helm chart, service account token and cluster role
  const kubeconfigMap = parseYaml(input.kubeconfig);
  const clusterServer = kubeconfigMap.clusters[0].cluster['server'];
  const clusterCaCert =
    kubeconfigMap.clusters[0].cluster['certificate-authority-data'];
  await Kubernetes.setup({
    kubeconfig: input.kubeconfig,
    fqdn: input.tls.fqdn,
  });
  // NIC
  const networkInterface = new azure_native.network.NetworkInterface(
    'vault-nic',
    {
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
    },
  );
  // Create VM
  const virtualMachine = new azure_native.compute.VirtualMachine(
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
        customData: createCloudInitCustomData({
          ipAddress: networkInterface.ipConfigurations.apply(
            (configurations) => configurations![0]!.privateIPAddress!,
          ),
          vaultFileStoragePath: '/opt/vault/data/',
          keyVault: {
            tenantId: input.tenantId,
            name: input.keyVault.name,
            secret_name: 'auto-unseal',
            client_id: input.vaultIdentity.clientId,
          },
          tls: {
            contactEmail: input.tls.contactEmail,
            cloudflareApiToken: input.tls.cloudflareApiToken,
            hostname: input.tls.fqdn,
            staging: input.tls.isStaging,
          },
          kubernetes: {
            server: clusterServer,
            caCert: clusterCaCert,
            token: Kubernetes.token,
          },
        }),
        linuxConfiguration: {
          patchSettings: {
            patchMode: azure_native.compute.LinuxVMGuestPatchMode.ImageDefault,
          },
          provisionVMAgent: true,
        },
      },
      securityProfile: {
        securityType: azure_native.compute.SecurityTypes.TrustedLaunch,
        uefiSettings: {
          secureBootEnabled: true,
          vTpmEnabled: true,
        },
      },
      identity: {
        type: 'UserAssigned',
        userAssignedIdentities: [input.vaultIdentity.id],
      },
      storageProfile: {
        osDisk: {
          caching: azure_native.compute.CachingTypes.ReadWrite,
          createOption: azure_native.compute.DiskCreateOptionTypes.FromImage,
          managedDisk: {
            storageAccountType:
              azure_native.compute.StorageAccountTypes.Standard_LRS,
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
      dependsOn: [networkInterface, input.subnet, input.keyVault],
      replaceOnChanges: ['osProfile'],
    },
  );
  return [virtualMachine, networkInterface];
}
