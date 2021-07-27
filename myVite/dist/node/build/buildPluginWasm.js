"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildWasmPlugin = void 0;
const buildPluginAsset_1 = require("./buildPluginAsset");
const wasmHelperId = 'vite/wasm-helper';
const createBuildWasmPlugin = (root, publicBase, assetsDir, inlineLimit) => {
  return {
    name: 'vite:wasm',
    resolveId(id) {
      // TODO
    }
  };
};
exports.createBuildWasmPlugin = createBuildWasmPlugin;