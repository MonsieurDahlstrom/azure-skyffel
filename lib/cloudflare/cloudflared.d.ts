import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import { NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare let virtualMachine: VirtualMachine;
export declare let networkInterface: NetworkInterface;
export type CloudflaredInput = {
  user: {
    username: string;
    password: pulumi.Output<string>;
  };
  routeCidr: string | pulumi.Output<string>;
  ingresses: cloudflare.types.input.ZeroTrustTunnelCloudflaredConfigConfigIngressRule[];
  cloudflare: {
    account: string;
    zone?: string;
  };
  subnetId: string | pulumi.Output<string>;
  resourceGroup: ResourceGroup;
  vmSize: string;
};
export declare function setup(input: CloudflaredInput): Promise<boolean>;
//# sourceMappingURL=cloudflared.d.ts.map
