"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVirtualMachine = createVirtualMachine;
const azure_native = __importStar(require("@pulumi/azure-native"));
const cloud_init_tls_certificate_1 = require("./cloud-init-tls-certificate");
const cloud_init_certbot_1 = require("./cloud-init-certbot");
const Kubernetes = __importStar(require("./kubernetes-vault-setup"));
const yaml_1 = require("yaml");
async function createVirtualMachine(input) {
    // Install kubernetes helm chart, service account token and cluster role
    const clusterCaCert = input.kubeconfig.apply((kubeconfig) => (0, yaml_1.parse)(kubeconfig).clusters[0].cluster['certificate-authority-data']);
    const clusterServer = input.kubeconfig.apply((kubeconfig) => (0, yaml_1.parse)(kubeconfig).clusters[0].cluster['server']);
    await Kubernetes.setup({
        kubeconfig: input.kubeconfig,
        fqdn: input.tls.fqdn,
    });
    // NIC
    const networkInterface = new azure_native.network.NetworkInterface('vault-nic', {
        resourceGroupName: input.resourceGroup.name,
        location: input.resourceGroup.location,
        enableIPForwarding: false,
        ipConfigurations: [
            {
                name: 'internal',
                subnet: {
                    id: input.subnetId !== undefined ? input.subnetId : input.subnet.id,
                },
                privateIPAllocationMethod: 'Dynamic',
            },
        ],
    });
    const cloudInitData = isCertbot(input.tls)
        ? (0, cloud_init_certbot_1.createCloudInitWithCertbot)({
            ipAddress: networkInterface.ipConfigurations.apply((configurations) => configurations[0].privateIPAddress),
            vaultFileStoragePath: '/opt/vault/data/',
            keyVault: {
                tenantId: input.tenantId,
                name: input.keyVault.name,
                secret_name: 'auto-unseal',
                client_id: input.vaultIdentity.clientId,
            },
            tls: input.tls,
            kubernetes: {
                server: clusterServer,
                caCert: clusterCaCert,
                token: Kubernetes.token,
            },
        })
        : (0, cloud_init_tls_certificate_1.createCloudInitWithTLS)({
            ipAddress: networkInterface.ipConfigurations.apply((configurations) => configurations[0].privateIPAddress),
            vaultFileStoragePath: '/opt/vault/data/',
            keyVault: {
                tenantId: input.tenantId,
                name: input.keyVault.name,
                secret_name: 'auto-unseal',
                client_id: input.vaultIdentity.clientId,
            },
            tls: input.tls,
            kubernetes: {
                server: clusterServer,
                caCert: clusterCaCert,
                token: Kubernetes.token,
            },
        });
    // Create VM
    const virtualMachine = new azure_native.compute.VirtualMachine('vault-vm', {
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
            customData: cloudInitData,
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
                    storageAccountType: azure_native.compute.StorageAccountTypes.Standard_LRS,
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
    }, {
        dependsOn: [networkInterface, input.keyVault],
        replaceOnChanges: ['osProfile'],
        deleteBeforeReplace: true,
    });
    return [virtualMachine, networkInterface];
}
function isCertbot(tls) {
    return tls.cloudflareApiToken !== undefined;
}
//# sourceMappingURL=virtual-machine.js.map