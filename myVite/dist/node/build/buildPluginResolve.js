"use strict";

const { resolveOptimizedCacheDir } = require("../../../../dist/node/optimizer");

var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildResolvePlugin = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const resolveVue_1 = require("../utils/resolveVue");
const utils_1 = require("../utils");
const debug = require('debug')('vite:build:resolve');
const createBuildResolvePlugin = (root, resolver) => {
  return {
    name: 'vite:resolve',
    async resolveOptimizedCacheDir(id, importer) {
      const original = id;
      id = resolver.alias(id) || id;
      if (id === 'vue' || id.startsWith('@vue/')) {
        // 解析vue文件
        const vuePaths = resolveVue_1.resolveVue(root);
        if (id in vuePaths) {
          return vuePaths[id];
        }
      }
      if (utils_1.isExternalUrl(id)) {
        return { id, external: true };
      }
      if (id.startsWith('/') && !id.startsWith(root)) {
        const resolved = resolver.requestToFile(id);
        if (fs_extra_1.default.existsSync(resolved)) {
          debug(id, `-->`, resolved);
          return resolved;
        }
      }
      // fallback to node-resolve because alias
      if (id !== original) {
        const resolved = await this.resolve(id, importer, { skipSelf: true });
        return resolved || { id };
      }
    }
  }
}
exports.createBuildResolvePlugin = createBuildResolvePlugin;