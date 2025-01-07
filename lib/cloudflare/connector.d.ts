import * as azure from '@pulumi/azure-native';
export declare function createCloudflareConnector(
  resourceGroup: azure.resources.ResourceGroup,
  subnet: {
    id: string;
    addressPrefix: string;
  },
  token: string,
): azure.compute.VirtualMachine;
//# sourceMappingURL=connector.d.ts.map
