import * as ipaddress from 'ip-address';
import { BigInteger } from 'jsbn';
import * as azure from '@pulumi/azure-native';

export function createNetwork(
  resourceGroup: azure.resources.ResourceGroup,
  name: string,
  cidr: string,
  dnsServers?: string[],
): azure.network.VirtualNetwork {
  const vnet = new azure.network.VirtualNetwork(name, {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
      addressPrefixes: [cidr],
    },
    dhcpOptions: {
      dnsServers: dnsServers ? dnsServers : ['AzureProvidedDNS'],
    },
  });
  return vnet;
}

export function createSubnets(
  snets: Map<string, azure.network.SubnetArgs>,
): Map<string, azure.network.Subnet> {
  const subnets = new Map<string, azure.network.Subnet>();
  for (const [key, value] of snets) {
    const subnet = new azure.network.Subnet(key, value);
    subnets.set(key, subnet);
  }
  return subnets;
}

// Takes an IP address range in CIDR notation (like 10.0.0.0/8) and extends its prefix to include an additional subnet number.
// For example:
// * cidrsubnet("10.0.0.0/8", 8, 2) returns 10.2.0.0/16
// * cidrsubnet("2607:f298:6051:516c::/64", 8, 2) returns 2607:f298:6051:516c:200::/72
export function cidrSubnet(
  iprange: string,
  newbits: number,
  netnum: number,
): string {
  if (ipaddress.Address4.isValid(iprange)) {
    const ipv4 = new ipaddress.Address4(iprange);
    const newsubnetMask = ipv4.subnetMask + newbits;
    if (newsubnetMask > 32) {
      throw new Error(
        'Requested ' +
          newbits +
          ' new bits, but only ' +
          (32 - ipv4.subnetMask) +
          ' are available.',
      );
    }
    const addressBI = ipv4.bigInteger();
    const twoBI = new BigInteger('2');
    const netnumBI = new BigInteger(netnum.toString());

    const newAddresBI = addressBI.add(
      twoBI.pow(32 - newsubnetMask).multiply(netnumBI),
    );
    const newAddress = ipaddress.Address4.fromBigInteger(newAddresBI).address;

    return newAddress + '/' + newsubnetMask;
  } else if (ipaddress.Address6.isValid(iprange)) {
    const ipv6 = new ipaddress.Address6(iprange);
    const newsubnetMask = ipv6.subnetMask + newbits;
    if (newsubnetMask > 128) {
      throw new Error(
        'Requested ' +
          newbits +
          ' new bits, but only ' +
          (128 - ipv6.subnetMask) +
          ' are available.',
      );
    }
    const addressBI = ipv6.bigInteger();
    const twoBI = new BigInteger('2');
    const netnumBI = new BigInteger(netnum.toString());

    const newAddresBI = addressBI.add(
      twoBI.pow(128 - newsubnetMask).multiply(netnumBI),
    );
    const newAddress =
      ipaddress.Address6.fromBigInteger(newAddresBI).correctForm();

    return newAddress + '/' + newsubnetMask;
  } else {
    throw new Error('Invalid IP address range: ' + iprange);
  }
}

// Takes an IP address range in CIDR notation and creates an IP address with the given host number.
// If given host number is negative, the count starts from the end of the range.
// For example:
// * cidrhost("10.0.0.0/8", 2) returns 10.0.0.2
// * cidrhost("10.0.0.0/8", -2) returns 10.255.255.254
export function cidrHost(iprange: string, hostnum: number): string {
  if (ipaddress.Address4.isValid(iprange)) {
    const ipv4 = new ipaddress.Address4(iprange);
    const hostnumBI = new BigInteger(hostnum.toString());
    let addressBI;
    if (hostnum >= 0) {
      const startAddressBI = ipv4.startAddress().bigInteger();
      addressBI = startAddressBI.add(hostnumBI);
    } else {
      const endAddressBI = ipv4.endAddress().bigInteger();
      addressBI = endAddressBI.add(hostnumBI).add(new BigInteger('1'));
    }
    return ipaddress.Address4.fromBigInteger(addressBI).address;
    //} else if (ipaddress.Address6.isValid(ipv6)) {
    //const ipv6 = new ipaddress.Address6(iprange);
    //TODO: implement IPv6
  } else {
    throw new Error('Invalid IP address range: ' + iprange);
  }
}
