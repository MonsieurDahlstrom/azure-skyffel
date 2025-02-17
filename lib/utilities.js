'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GetValue = GetValue;
function GetValue(output) {
  return new Promise((resolve, reject) => {
    output.apply((value) => {
      resolve(value);
    });
  });
}
//# sourceMappingURL=utilities.js.map
