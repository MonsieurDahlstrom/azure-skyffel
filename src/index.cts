import networking = require('./network/index.cjs');
import aks = require('./aks/index.cjs');

export = {
  createNetwork: networking.createNetwork,
  createSubnets: networking.createSnets,
  createAks: aks.createAks,
};
