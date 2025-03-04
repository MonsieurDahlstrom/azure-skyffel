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
exports.policies = exports.kyverno = void 0;
exports.setup = setup;
const k8s = __importStar(require('@pulumi/kubernetes'));
const KyvernoHelmVersion = '3.3.7';
const KyvernoPoliciesHelmVersion = '3.3.4';
async function setup(input) {
  const ns = new k8s.core.v1.Namespace(
    'kyverno',
    {
      metadata: {
        name: 'kyverno',
      },
    },
    { provider: input.provider },
  );
  exports.kyverno = new k8s.helm.v3.Chart(
    'kyverno',
    {
      namespace: ns.metadata.name,
      chart: 'kyverno',
      version: input.kyvernoHelmVersion
        ? input.kyvernoHelmVersion
        : KyvernoHelmVersion,
      fetchOpts: {
        repo: 'https://kyverno.github.io/kyverno/',
      },
      values: {},
    },
    { provider: input.provider },
  );
  exports.policies = new k8s.helm.v3.Chart(
    'kyverno-policies',
    {
      namespace: ns.metadata.name,
      chart: 'kyverno-policies',
      version: input.policiesHelmVersion
        ? input.policiesHelmVersion
        : KyvernoPoliciesHelmVersion,
      fetchOpts: {
        repo: 'https://kyverno.github.io/kyverno/',
      },
      values: {},
    },
    { provider: input.provider, dependsOn: [exports.kyverno] },
  );
}
//# sourceMappingURL=kyverno.js.map
