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
exports.subnets = exports.virtualNetwork = exports.Delegation = void 0;
exports.setupNetwork = setupNetwork;
exports.setupSubnets = setupSubnets;
const azure = __importStar(require("@pulumi/azure-native"));
var Delegation;
(function (Delegation) {
    Delegation[Delegation["None"] = 0] = "None";
    Delegation[Delegation["GithubRunner"] = 1] = "GithubRunner";
    Delegation[Delegation["PrivateDNSResovler"] = 2] = "PrivateDNSResovler";
})(Delegation || (exports.Delegation = Delegation = {}));
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
function setupSubnets(snets) {
    for (const [key, value] of snets) {
        switch (value.delegationType) {
            case Delegation.GithubRunner:
                value.delegations = [
                    {
                        name: 'github-network-settings',
                        actions: ['Microsoft.Network/virtualNetwork/join/action'],
                        serviceName: 'Github.Network/networkSettings',
                    },
                ];
                break;
            case Delegation.PrivateDNSResovler:
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