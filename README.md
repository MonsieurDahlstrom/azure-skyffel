# azure-skyffle

WIP
A typescript WIP collection to build azure and cloudflare infrastructure with [Pulumi](https://pulumi.com)
The sketches below expects a pulumi stack configured with cloudflare and azure-native providers via ESC. With the following configuration key set:
```yaml
config:
    azure-vnet:
        name: development
        layout:
            cidr: '10.0.0.0/20'
            subnets:
            - name: "dmz"
                cidr: "10.0.0.0/27"
                delegationType: None
            - name: "kubernetes-loadbalancers"
                cidr: "10.0.0.32/27"
                delegationType: None
            - name: "virtual-machines"
                cidr: "10.0.0.64/26"
                delegationType: None
            - name: "private-endpoints"
                cidr: "10.0.0.128/26"
                delegationType: None
            - name: "kubernetes-nodes"
                cidr: "10.0.1.0/24"
                delegationType: None
```
## AzureVnet
Builds vnet and subnets following the yaml specification above. Delegation type can be None, GithubRunner, PrivateDNSResovler.
```typescript
import {AzureVnet} from "@monsieurdahlstrom/azure-skyffle"
import * as azure_native from "@pulumi/azure-native";

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`);    // load network stack
  //load network layout
  const network:Azurevnet.Layout = input.config.requireObject("azure-vnet");
  // create virtual network
  await AzureVnet.setup({...network, resourceGroup});
}
```

## Cloudflare
Builds a VM in designated subnet and establish a tunnel to cloudflare with route setup to the vnet address space

```typescript
import { Cloudflared, AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from "@pulumi/azure-native";

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`);    // load network stack
  //load network layout
  const network:Azurevnet.Layout = input.config.requireObject("azure-vnet");
  // create virtual network
  await AzureVnet.setup({...network, resourceGroup});

  await Cloudflared.setup({
    user: {
      username: cloudflareVmUsername,
      password: cloudflareVmPassword,
    },
    routeCidr: AzureVnet.virtualNetwork.addressSpace!.apply(
      (space) => space!.addressPrefixes![0],
    ),
    subnetId: AzureVnet.subnets.get('dmz')!.id,
    resourceGroup,
    ingresses: [
      {service: "http_status:404"}
    ],
    cloudflare: {
      zone: config.require('cloudflare-zone-id'),
      account: config.require('cloudflare-account-id'),
    },
    vmSize: 'Standard_B2s',
  });
}
```
