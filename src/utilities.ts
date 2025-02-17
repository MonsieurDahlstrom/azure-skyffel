import * as pulumi from '@pulumi/pulumi';
import * as azure_native from '@pulumi/azure-native';

export function GetValue<T>(output: pulumi.Output<T>) {
  return new Promise<T>((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}
