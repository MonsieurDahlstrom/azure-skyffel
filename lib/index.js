'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
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
//# sourceMappingURL=index.js.map
