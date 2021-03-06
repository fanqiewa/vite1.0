"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wasmPlugin = void 0;
const utils_1 = require("../utils");
const wasmPlugin = ({ app }) => {
  app.use((ctx, next) => {
    if (ctx.path.endsWith('.wasm') && utils_1.isImportRequest(ctx)) {
      ctx.type = 'js';
      ctx.body = `export default (opts = {}) => {
        return WebAssembly.instantiateStreaming(fetch(${JSON.stringify(ctx.path)}), opts)
        .then(obj => obj.instance.exports)
      }`;
      return;
    }
    return next();
  });
}
exports.wasmPlugin = wasmPlugin;