# azure-skyffle

WIP
A typescript WIP collection to build azure and cloudflare infrastructure with [Pulumi](https://pulumi.com)

AzureVnet
Builds a vnet and subnets prepopulated with delegations.

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

```typescript
import {AzureVnet} from "@monsieurdahlstrom/azure-skyffle"
const network:Azurevnet.Layout = input.config.requireObject("azure-vnet");
// create virtual network
AzureVnet.setupNetwork (input.resourceGroup, `vnet-${network.name)}`, network.layout.cidr);
//define subnets
const subnetLayout = new Map<string, AzureVnet.SubnetArgs>();
const network.layout.subnets.forEach((element) => {
    subnetTopology.set(element.name, {
        resourceGroupName: input.resourceGroup.name,
        virtualNetworkName: AzureVnet.virtualNetwork.name,
        addressPrefix: element.cidr,
        delegationType: AzureVnet.Delegation[element.delegationType as keyof typeof AzureVnet.Delegation],
    });
})
//create subnets
AzureVnet.setupSubnets(subnetTopology);
//retrive dns hub zones and link them if needed\
await SpokeDNS.setup(`MonsieurDahlstrom/dns/production`, AzureVnet.virtualNetwork);
```

Cloudflare
Builds a VM in designated subnet and establish a tunnel to cloudflare with route setup to the vnet address space

```typescript
import { Cloudflared } from '@monsieurdahlstrom/azure-skyffle';

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
  cloudflare: {
    zone: config.require('cloudflare-zone-id'),
    account: config.require('cloudflare-account-id'),
  },
  vmSize: 'Standard_B2s',
});
```
