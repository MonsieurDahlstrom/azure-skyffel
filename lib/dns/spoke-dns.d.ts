import * as azure_native from '@pulumi/azure-native';
export declare let zones: Map<
  string,
  azure_native.network.GetPrivateZoneResult
>;
export declare function setup(
  stackLocation: string,
  network: azure_native.network.GetVirtualNetworkResult,
): Promise<void>;
//# sourceMappingURL=spoke-dns.d.ts.map
