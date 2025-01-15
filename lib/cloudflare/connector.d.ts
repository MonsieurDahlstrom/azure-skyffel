import { Subnet, NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare function createCloudflareConnector(
  resourceGroup: ResourceGroup,
  subnet: Subnet,
  token: string,
  user:
    | {
        username: string;
        password: string;
      }
    | undefined,
): Promise<[VirtualMachine, NetworkInterface]>;
//# sourceMappingURL=connector.d.ts.map
