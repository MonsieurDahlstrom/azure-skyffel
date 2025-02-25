"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeTable = exports.networkSecurityGroup = exports.subnet = void 0;
exports.setup = setup;
const network_1 = require("@pulumi/azure-native/network");
const network_2 = require("@pulumi/azure-native/network");
const network_3 = require("@pulumi/azure-native/network");
async function setup(input) {
    exports.subnet = new network_1.Subnet('cloudflare-ztna-gateway', {
        resourceGroupName: input.resourceGroup.name,
        virtualNetworkName: input.virtualNetwork.name,
        addressPrefix: input.subnetCidr,
    });
    exports.routeTable = new network_3.RouteTable('cloudflare-ztna-route-table', {
        resourceGroupName: input.resourceGroup.name,
        routes: [],
    });
    exports.networkSecurityGroup = new network_2.NetworkSecurityGroup('cloudflare-ztna-nsg', {
        resourceGroupName: input.resourceGroup.name,
        location: input.resourceGroup.location,
        securityRules: [],
    });
    return true;
}
//# sourceMappingURL=cloudflare.js.map