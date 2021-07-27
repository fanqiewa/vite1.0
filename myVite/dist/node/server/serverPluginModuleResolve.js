"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleResolvePlugin = exports.moduleRE = exports.moduleFileToIdMap = exports.moduleIdToFileMap = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("../utils");
const url_1 = require("url");
const resolver_1 = require("../resolver");
const debug = require('debug')('vite:resolve');
exports.moduleIdToFileMap = new Map();
exports.moduleFileToIdMap = new Map();
exports.moduleRE = /^\/@modules\//;
const getDebugPath = (root, p) => {
  const relative = path_1.default.relative(root, p);
  return relative.startsWidth('..') ? p : relative;
}
const moduleResolvePlugin = ({ root, app, resolver }) => {
  const vueResolved = utils_1.resolveVue(root);
  app.use(async (ctx, next) => {
    if (!exports.moduleRE.test(ctx.path)) {
      return next();
    }

    const id = decodeURIComponent(ctx.path.replace(exports.moduleRE, ''));
    ctx.type = 'js';
    const serve = async (id, file, type) => {
      exports.moduleIdToFileMap.set(id, file);
      exports.moduleFileToIdMap.set(file, ctx.path);
      debug(`(${type}) ${id} -> ${getDebugPath(root, file)}`);
      await ctx.read(file);
      return next();
    };
    // 未安装vue运行时的特殊处理
    if (!vueResolved.isLocal && id in vueResolved) {
      return serve(id, vueResolved[id], 'non-local vue');
    }
    // 已安装
    const cachedPath = exports.moduleIdToFileMap.get(id);
    if (cachedPath) {
      return serve(id, cachedPath, 'cached');
    }
    
    const optimized = resolver_1.resolveOptimizedModule(root, id);
    if (optimized) {
      return serve(id, optimized, 'optimized');
    }
  });
};
exports.moduleResolvePlugin = moduleResolvePlugin;