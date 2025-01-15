import { Subnet, NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare let virtualMachine: VirtualMachine | undefined;
export declare let networkInterface: NetworkInterface | undefined;
export type CloudflareConnectorInput = {
  user: {
    username: string;
    password: string;
  };
  subnet: Subnet;
  resourceGroup: ResourceGroup;
  tunnelToken: string;
};
export declare function setup(
  input: CloudflareConnectorInput,
): Promise<boolean>;
//# sourceMappingURL=connector.d.ts.map
