import * as azure from '@pulumi/azure-native';
export declare function createCloudflareConnector(
  resourceGroup: azure.resources.ResourceGroup,
  subnet: azure.network.Subnet,
  token: string,
): Promise<[virtualMachine: azure.compute.VirtualMachine]>;
//# sourceMappingURL=connector.d.ts.map
