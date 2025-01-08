import * as azure from '@pulumi/azure-native';

export type AksInput = {
  name: string;
  resourceGroup: azure.resources.ResourceGroup;
  vnet: azure.network.VirtualNetwork;
  nodes: azure.network.Subnet;
  pods?: azure.network.Subnet;
  defaultNode: {
    min: number;
    max: number;
    vmSize: string;
    zones: string[];
  };
  privateDnsZone?: azure.network.PrivateZone;
  commonTags?: { [key: string]: string };
};

export function createAKS(
  input: AksInput,
): azure.containerservice.ManagedCluster {
  const aks = new azure.containerservice.ManagedCluster(input.name, {
    resourceGroupName: input.resourceGroup.name,
    agentPoolProfiles: [
      {
        count: input.defaultNode.min,
        maxPods: 110,
        mode: 'System',
        name: 'agentpool',
        nodeLabels: {},
        osDiskSizeGB: 128,
        osDiskType: 'Ephemeral',
        osType: 'Linux',
        type: 'VirtualMachineScaleSets',
        vmSize: input.defaultNode.vmSize,
        vnetSubnetID: input.nodes.id,
        availabilityZones: input.defaultNode.zones,
      },
    ],
    apiServerAccessProfile: {
      enablePrivateCluster: true,
      privateDNSZone: input.privateDnsZone?.id,
    },
    autoScalerProfile: {
      scaleDownDelayAfterAdd: '15m',
      scanInterval: '30s',
    },
    dnsPrefix: input.name,
    enableRBAC: true,
    kubernetesVersion: '1.31',
    publicNetworkAccess: 'Deny',
    autoUpgradeProfile: {
      upgradeChannel: azure.containerservice.UpgradeChannel.Node_image,
    },
  });
  return aks;
}
