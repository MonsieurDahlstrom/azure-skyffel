import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

export let network: azure_native.network.GetVirtualNetworkResult;
export let snets: Map<string, azure_native.network.GetSubnetResult> = new Map();
export let resourceGroupName: string;
export async function setup(stackLocation: string): Promise<boolean> {
  const stack = new pulumi.StackReference(stackLocation);
  resourceGroupName = await stack.requireOutputValue('resourceGroupName');
  const networkName = await stack.requireOutputValue('networkName');
  network = await azure_native.network.getVirtualNetwork({
    resourceGroupName: resourceGroupName,
    virtualNetworkName: networkName,
  });
  const snetData: { resourceGroupName: string; name: string }[] =
    await stack.getOutputValue('subnetNames');
  snetData.forEach(async (snetData) => {
    snets.set(
      snetData.name,
      await azure_native.network.getSubnet({
        resourceGroupName: resourceGroupName,
        virtualNetworkName: networkName,
        subnetName: snetData.name,
      }),
    );
  });
  return true;
}
