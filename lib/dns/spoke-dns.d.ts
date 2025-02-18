import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';
export declare let zones: Map<
  string,
  azure_native.network.GetPrivateZoneResult
>;
export declare let resourceGroupName: string;
export declare function setup(
  stackLocation: string,
  network:
    | azure_native.network.GetVirtualNetworkResult
    | azure_native.network.VirtualNetwork,
): Promise<void>;
export declare function createRecordSet(input: {
  zone: azure_native.network.GetPrivateZoneResult;
  recordType: string;
  host: string;
  ipv4Address: string | pulumi.Output<string>;
}): azure_native.network.PrivateRecordSet;
//# sourceMappingURL=spoke-dns.d.ts.map
