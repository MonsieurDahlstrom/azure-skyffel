import * as pulumi from '@pulumi/pulumi';
import { Subnet, NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare let virtualMachine: VirtualMachine;
export declare let networkInterface: NetworkInterface;
export type CloudflaredInput = {
  user: {
    username: string;
    password: pulumi.Output<string>;
  };
  routeCidr: string;
  cloudflare: {
    account: string;
    zone?: string;
  };
  subnet?: Subnet;
  subnetId?: string;
  resourceGroup: ResourceGroup;
  vmSize: string;
};
export declare function setup(input: CloudflaredInput): Promise<boolean>;
//# sourceMappingURL=cloudflared.d.ts.map
