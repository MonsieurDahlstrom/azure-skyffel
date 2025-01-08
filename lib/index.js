'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createAKS =
  exports.createCloudflareConnector =
  exports.createCloudflareZTNASubnet =
  exports.createGithubRunnerSubnet =
  exports.cidrSubnet =
  exports.cidrHost =
  exports.createSubnets =
  exports.createNetwork =
    void 0;
var core_js_1 = require('./network/core.js');
Object.defineProperty(exports, 'createNetwork', {
  enumerable: true,
  get: function () {
    return core_js_1.createNetwork;
  },
});
Object.defineProperty(exports, 'createSubnets', {
  enumerable: true,
  get: function () {
    return core_js_1.createSubnets;
  },
});
Object.defineProperty(exports, 'cidrHost', {
  enumerable: true,
  get: function () {
    return core_js_1.cidrHost;
  },
});
Object.defineProperty(exports, 'cidrSubnet', {
  enumerable: true,
  get: function () {
    return core_js_1.cidrSubnet;
  },
});
var github_runners_js_1 = require('./network/github-runners.js');
Object.defineProperty(exports, 'createGithubRunnerSubnet', {
  enumerable: true,
  get: function () {
    return github_runners_js_1.createGithubRunnerSubnet;
  },
});
var cloudflare_js_1 = require('./network/cloudflare.js');
Object.defineProperty(exports, 'createCloudflareZTNASubnet', {
  enumerable: true,
  get: function () {
    return cloudflare_js_1.createCloudflareZTNASubnet;
  },
});
var connector_js_1 = require('./cloudflare/connector.js');
Object.defineProperty(exports, 'createCloudflareConnector', {
  enumerable: true,
  get: function () {
    return connector_js_1.createCloudflareConnector;
  },
});
var core_js_2 = require('./aks/core.js');
Object.defineProperty(exports, 'createAKS', {
  enumerable: true,
  get: function () {
    return core_js_2.createAKS;
  },
});
//# sourceMappingURL=index.js.map
