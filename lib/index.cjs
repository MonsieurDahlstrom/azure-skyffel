'use strict';
const networking = require('./network/index.cjs');
const aks = require('./aks/index.cjs');
module.exports = {
  createNetwork: networking.createNetwork,
  createSubnets: networking.createSnets,
  createAks: aks.createAks,
};
//# sourceMappingURL=index.cjs.map
