import { Output } from '@pulumi/pulumi';
import { NetworkInterface } from '@pulumi/azure-native/network';
import { VirtualMachine } from '@pulumi/azure-native/compute';
import { ResourceGroup } from '@pulumi/azure-native/resources';
export declare let virtualMachine: VirtualMachine | undefined;
export declare let networkInterface: NetworkInterface | undefined;
export type CloudflareConnectorInput = {
    user: {
        username: string | Output<string>;
        password: string | Output<string>;
    };
    subnetId?: string | Output<string>;
    resourceGroup: ResourceGroup;
    tunnelToken: string;
    vmSize: string;
};
export declare function setup(input: CloudflareConnectorInput): Promise<boolean>;
//# sourceMappingURL=connector.d.ts.map