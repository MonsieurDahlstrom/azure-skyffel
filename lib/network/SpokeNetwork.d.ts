import * as azure_native from '@pulumi/azure-native';
export declare let network: azure_native.network.GetVirtualNetworkResult;
export declare let snets: Map<string, azure_native.network.GetSubnetResult>;
export declare let resourceGroupName: string;
export declare function setup(stackLocation: string): Promise<boolean>;
//# sourceMappingURL=SpokeNetwork.d.ts.map
