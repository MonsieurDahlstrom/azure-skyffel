import * as pulumi from '@pulumi/pulumi';
export declare function GetValue<T>(output: pulumi.Output<T>): Promise<T>;
export declare function cidrSubnet(
  iprange: string,
  newbits: number,
  netnum: number,
): string;
export declare function cidrHost(iprange: string, hostnum: number): string;
//# sourceMappingURL=utilities.d.ts.map
