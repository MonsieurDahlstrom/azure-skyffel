import * as azure_native from '@pulumi/azure-native';
export declare let resolver: azure_native.network.DnsResolver;
export declare let inboundEndpoint: azure_native.network.InboundEndpoint;
type PrivateResolverInput = {
    resourceGroup: azure_native.resources.ResourceGroup;
    network: azure_native.network.VirtualNetwork;
    subnet: azure_native.network.Subnet;
};
export declare function setup(input: PrivateResolverInput): Promise<boolean>;
export {};
//# sourceMappingURL=hub-dns-resolver.d.ts.map