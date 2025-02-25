import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export declare const zones: Map<string, azure_native.network.PrivateZone>;
type PrivateDnsZoneContributorIdentity = {
    id: string;
    type: string;
};
type SetupInput = {
    resourceGroup: azure_native.resources.ResourceGroup;
    network: azure_native.network.VirtualNetwork;
    dnsZoneContributors?: PrivateDnsZoneContributorIdentity[];
    dnsZoneRoleAdministrators?: PrivateDnsZoneContributorIdentity[];
    subscriptionId?: string;
    stack?: pulumi.StackReference;
    zones?: Map<string, pulumi.Output<string>>;
};
export declare function setup(input: SetupInput): Promise<boolean>;
export declare function createAddressEntry(input: {
    ipAddress: string;
    name: string;
    dnsZone: azure_native.network.PrivateZone;
    resourceGroup: azure_native.resources.ResourceGroup;
}): Promise<boolean>;
export {};
//# sourceMappingURL=hub-dns.d.ts.map