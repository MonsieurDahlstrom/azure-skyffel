'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.createNetwork = createNetwork;
exports.createSubnets = createSubnets;
exports.cidrSubnet = cidrSubnet;
exports.cidrHost = cidrHost;
const ipaddress = __importStar(require('ip-address'));
const jsbn_1 = require('jsbn');
const azure = __importStar(require('@pulumi/azure-native'));
function createNetwork(resourceGroup, name, cidr, dnsServers) {
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
function createSubnets(snets) {
  const subnets = new Map();
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
function cidrSubnet(iprange, newbits, netnum) {
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
    const twoBI = new jsbn_1.BigInteger('2');
    const netnumBI = new jsbn_1.BigInteger(netnum.toString());
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
    const twoBI = new jsbn_1.BigInteger('2');
    const netnumBI = new jsbn_1.BigInteger(netnum.toString());
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
function cidrHost(iprange, hostnum) {
  if (ipaddress.Address4.isValid(iprange)) {
    const ipv4 = new ipaddress.Address4(iprange);
    const hostnumBI = new jsbn_1.BigInteger(hostnum.toString());
    let addressBI;
    if (hostnum >= 0) {
      const startAddressBI = ipv4.startAddress().bigInteger();
      addressBI = startAddressBI.add(hostnumBI);
    } else {
      const endAddressBI = ipv4.endAddress().bigInteger();
      addressBI = endAddressBI.add(hostnumBI).add(new jsbn_1.BigInteger('1'));
    }
    return ipaddress.Address4.fromBigInteger(addressBI).address;
    //} else if (ipaddress.Address6.isValid(ipv6)) {
    //const ipv6 = new ipaddress.Address6(iprange);
    //TODO: implement IPv6
  } else {
    throw new Error('Invalid IP address range: ' + iprange);
  }
}
//# sourceMappingURL=core.js.map
