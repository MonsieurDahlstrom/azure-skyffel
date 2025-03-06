# azure-skyffle

## idea

A typescript WIP collection to build azure and cloudflare infrastructure with [Pulumi](https://pulumi.com).
A common pattern when starting out with the gitops is to build a set of private cloud environments that accessible to employee and contracts via virtual wan and via WAF protected entrypoint for customers.

- This repo provides a set of typescript building blocks to get someone started on such a journey.
- Where Cloudflare is used as a zero trust network for employess and a WAF/CDN for customers.
- Each environment is build in Azure, comprising of a kubernetes cluster for all deployed services, backed by Vault for shortlived credentials
- Azure private dns zones are shared between environment and exposed in a central dns resolver enviroment
- Application specific azure resources can be constructed with crossplane.

## Prerequsits

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
import { AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
};
```

## Cloudflare

Builds a VM in designated subnet and establish a tunnel to cloudflare with route setup to the vnet address space

```typescript
import { Cloudflared, AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });

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
    ingresses: [{ service: 'http_status:404' }],
    cloudflare: {
      zone: config.require('cloudflare-zone-id'),
      account: config.require('cloudflare-account-id'),
    },
    vmSize: 'Standard_B2s',
  });
};
```

## Hub & Spoke dns

Frequently in a sd-wan dns records needs to be resolvable centrally, could be in a azure vwan or cloudflare ztna setup. HubDNS, HubDNSResolver and SpokeDNS provides an abstraction for this. Where HubSpoke is instantiated within a hub vnet or dns resovler vnet, it creates private dns zones and links them to the vnet. HubDnsResolver, creates an azuer private dns resolver. While the SpokeDNS looks up a pulumi stack, retrives the created dns zones and links them to the spoke vnet.

### HubDNS

```typescript
import { HubDNS, AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
  //list desired dns zones
  const dnsZones = new Map<string, pulumi.Output<string>>();
  dnsZones.set(
    'aks',
    pulumi.interpolate`privatelink.${config.require('location')}.azmk8s.io`,
  );
  dnsZones.set('keyvault', pulumi.interpolate`privatelink.vaultcore.azure.net`);
  //create zones and resolver
  HubDNS.setup({
    resourceGroup,
    network: AzureVnet.virtualNetwork,
    zones: dnsZones,
    // users, identities, groups that should be allowed to contribute
    dnsZoneContributors: [],
    // users, identities, groups that should be allowed as admins
    dnsZoneRoleAdministrators: [],
    subscriptionId: config.require('subscription-id'),
  });
  //export the dns zones
  return {
    ...HubDNS.outputs(),
  };
};
```

### HubDNSResolver

```typescript
import { HubDNS, AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
  //list desired dns zones
  const dnsZones = new Map<string, pulumi.Output<string>>();
  dnsZones.set(
    'aks',
    pulumi.interpolate`privatelink.${config.require('location')}.azmk8s.io`,
  );
  dnsZones.set('keyvault', pulumi.interpolate`privatelink.vaultcore.azure.net`);
  //create zones
  HubDNS.setup({
    resourceGroup,
    network: AzureVnet.virtualNetwork,
    zones: dnsZones,
    // users, identities, groups that should be allowed to contribute
    dnsZoneContributors: [],
    // users, identities, groups that should be allowed as admins
    dnsZoneRoleAdministrators: [],
    subscriptionId: config.require('subscription-id'),
  });
  //
  await HubDNSResolver.setup({
    resourceGroup,
    network: AzureVnet.virtualNetwork,
    subnet: AzureVnet.subnets.get('dns-resolver')!,
  });
  //export the dns zones and internal ipv4 of private dns resolution
  return {
    ...HubDNS.outputs(),
    ...HubDNSResolver.outputs(),
  };
};
```

### SpokeDNS

```typescript
import { SpokeDNS, AzureVnet } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
  //find and register zones from hub or dns stack
  await SpokeDNS.setup('org/proj/stack', AzureVnet.virtualNetwork);
  //create a entry in provided dns zone
  SpokeDNS.createRecordSet({
    zone: SpokeDNS.zones.get(`test.com`)!,
    host: `www`,
    recordType: 'A',
    ipv4Address: '10.0.0.5', // string or Output
  });
};
```

## AKS

### AzureKubernetes

Builds AKS with cilium and advanced container networking services to enable hubble.

```typescript
import {
  SpokeDNS,
  AzureVnet,
  AzureKubernetes,
} from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
  //find and register zones from hub or dns stack
  await SpokeDNS.setup('org/proj/stack', AzureVnet.virtualNetwork);
  //build k8s
  await AzureKubernetes.setup({
    name: `aks-test`,
    resourceGroup,
    networkId: AzureVnet.virtualNetwork!.id,
    nodesId: AzureVnet.subnets.get('kubernetes-nodes')!.id,
    defaultNode: {
      min: 1,
      max: 3,
      vmSize: 'Standard_B2s',
      diskSize: 32,
      osDiskType: azure_native.containerservice.OSDiskType.Managed,
      zones: ['2'],
    },
    privateDnsZoneId: SpokeDNS.zones.get(
      `privatelink.${config.require('location')}.azmk8s.io`,
    )!.id!,
    subscriptionId: config.require('subscription-id'),
  });
};
```

### AzureKubernetesApplications

A set of applications installed in most of these cluster. External-DNS to manage private dns entries for httpresources created in cluster. Traefik to be Gateway manager for httpresources, ingress and ingressroutes are disabled. Kyverno and Crossplane installed to manage cloud resources.

```typescript
// ... SpokeDNS setup
// ... AzureKubernetes setup
await AzureKubernetesApplications.setup({
  provider,
  cluster: AzureKubernetes.cluster,
  subscriptionId: config.require('subscription-id'),
  resourceGroupName: resourceGroup.name,
  externalDNS: {
    tenantId: config.require('tenant-id'),
    zoneData: {
      subscriptionId: dnsSubscriptionId,
      resourceGroupName: await dnsStack.getOutputValue('resourceGroupName'),
      zones: [SpokeDNS.zones.get(`monsieurdahlstrom.dev`)!],
    },
  },
  traefikGateway: {
    loadbalancerSubnetName: 'kubernetes-loadbalancers',
    hostname: `*.monsieurdahlstrom.dev`,
    tls: {
      certificate: certificate.apply((cert) => `${cert.certificateFullChain}`),
      key: certificate.apply((cert) => `${cert.key}`),
    },
  },
  crossplane: {},
  kyverno: {},
});
```

### Hashicorp Vault

Builds a VM that setups a vault instance, a key vault where auto unseal keysm, recovery shares and root token is stored. Additional sets up kubernetes secret engine to k8s cluster so that short lived access tokens can be generated.

```typescript
import { SpokeDNS, AzureVnet, AzureKubernetes, Vault } from '@monsieurdahlstrom/azure-skyffle';
import * as azure_native from '@pulumi/azure-native';

export = async () => {
  const resourceGroup = new azure_native.resources.ResourceGroup(`rg-demo`); // load network stack
  //load network layout
  const network: Azurevnet.Layout = input.config.requireObject('azure-vnet');
  // create virtual network
  await AzureVnet.setup({ ...network, resourceGroup });
  //find and register zones from hub or dns stack
  await SpokeDNS.setup('org/proj/stack', AzureVnet.virtualNetwork);
  //build k8s
  await AzureKubernetes.setup({
    name: `aks-test`,
    resourceGroup,
    networkId:  AzureVnet.virtualNetwork!.id,
    nodesId:  AzureVnet.subnets.get('kubernetes-nodes')!.id,
    defaultNode: {
        min: 1,
        max: 3,
        vmSize: "Standard_B2s",
        diskSize: 32,
        osDiskType: azure_native.containerservice.OSDiskType.Managed,
        zones: ["2"],
    },
    privateDnsZoneId: SpokeDNS.zones.get(`privatelink.${config.require("location")}.azmk8s.io`)!.id!,
    subscriptionId: config.require("subscription-id"),
  });
  //create user and pw for the vault vm
  vaultVmUsername = "vault";
  const vaultVmPasswordResource = new random.RandomPassword("vault-password", {
      length: 24,
      special: true,
      overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
  });
  vaultVmPassword = vaultVmPasswordResource.result;
  await Vault.setup({
      subnet: AzureVnet.subnets.get('virtual-machines'),
      resourceGroup,
      user: {
          username: pulumi.interpolate `${vaultVmUsername}`,
          password: vaultVmPassword,
      },
      vmSize: "Standard_B2s",
      tenantId: config.require("tenant-id"),
      subscriptionId: config.require("subscription-id"),
      /*
        tls could also be something like acme resource rather certbot generated
        tls: {
            fqdn: `vault-${config.require("environment")}.monsieurdahlstrom.dev`,
            certificate: certificate.apply(cert => `${cert.certificateFullChain}`),
            issuer: certificate.apply(cert => `${cert.issuer}`),
            key: certificate.apply(cert => `${cert.key}`),
        },
      */
      //generate tls certificate via certbot and the cloudflare provider
      tls: {
        cloudflareApiToken: config.requireValue('cloudflare-api-token');
        contactEmail: "user@test.com";
        fqdn: 'vault.test.com';
        isStaging: true;
      },
      keyVault: {
          subnet: AzureVnet.subnets.get('private-endpoints'),
          dnsZoneId: SpokeDNS.zones.get(`privatelink.vaultcore.azure.net`)!.id!,
          officers:  [
              {
                  id: 'f3227a35-b6aa-4686-ae14-7eee15bddb7e',
                  type: "Group",
              }
          ],
      },
      kubeconfig: AzureKubernetes.adminCredentials.apply( credentials => Buffer.from(credentials.kubeconfigs[0].value, "base64").toString() ),
  });
  //register a private dns entry for the server
  SpokeDNS.createRecordSet({
      zone: SpokeDNS.zones.get(`test.com`)!,
      host: `vault`,
      recordType: "A",
      ipv4Address: Vault.networkInterface.ipConfigurations.apply( ipConfigurations => ipConfigurations![0].privateIPAddress!),
  });
}
```
