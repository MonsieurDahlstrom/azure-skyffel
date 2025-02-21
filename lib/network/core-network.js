"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MDSubbnetDelegation = exports.subnets = exports.virtualNetwork = void 0;
exports.setupNetwork = setupNetwork;
exports.setupSubnets = setupSubnets;
const azure = __importStar(require("@pulumi/azure-native"));
exports.subnets = new Map();
function setupNetwork(resourceGroup, name, cidr, dnsServers) {
    exports.virtualNetwork = new azure.network.VirtualNetwork(name, {
        resourceGroupName: resourceGroup.name,
        addressSpace: {
            addressPrefixes: [cidr],
        },
        dhcpOptions: {
            dnsServers: dnsServers,
        },
    });
}
var MDSubbnetDelegation;
(function (MDSubbnetDelegation) {
    MDSubbnetDelegation[MDSubbnetDelegation["None"] = 0] = "None";
    MDSubbnetDelegation[MDSubbnetDelegation["GithubRunner"] = 1] = "GithubRunner";
    MDSubbnetDelegation[MDSubbnetDelegation["PrivateDNSResovler"] = 2] = "PrivateDNSResovler";
})(MDSubbnetDelegation || (exports.MDSubbnetDelegation = MDSubbnetDelegation = {}));
function setupSubnets(snets) {
    for (const [key, value] of snets) {
        switch (value.delegationType) {
            case MDSubbnetDelegation.GithubRunner:
                value.delegations = [
                    {
                        name: 'github-network-settings',
                        actions: ['Microsoft.Network/virtualNetwork/join/action'],
                        serviceName: 'Github.Network/networkSettings',
                    },
                ];
                break;
            case MDSubbnetDelegation.PrivateDNSResovler:
                value.delegations = [
                    {
                        name: 'Microsoft.Network.dnsResolvers',
                        actions: ['Microsoft.Network/virtualNetwork/join/action'],
                        serviceName: 'Microsoft.Network/dnsResolvers',
                    },
                ];
                break;
            default:
                break;
        }
        const subnet = new azure.network.Subnet(key, value);
        exports.subnets.set(key, subnet);
    }
}
//# sourceMappingURL=core-network.js.map