"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codegenCss = exports.cssPlugin = exports.debugCSS = void 0;
const path_1 = require("path");
const hash_sum_1 = __importDefault(require("hash-sum"));
const utils_1 = require("../utils");
const serverPluginVue_1 = require("./serverPluginVue");
const cssUtils_1 = require("../utils/cssUtils");
const querystring_1 = __importDefault(require("querystring"));
const chalk_1 = __importDefault(require("chalk"));
const serverPluginClient_1 = require("./serverPluginClient");
const pluginutils_1 = require("@rollup/pluginutils");
exports.debugCSS = require('debug')('vite:css');
const cssPlugin = ({ root, app, watcher, resolver }) => {
  app.use(async (ctx, next) => {
    await next();
    // 处理 .css 文件
    if (cssUtils_1.isCSSRequest(ctx.path) &&
      ctx.body) {
      const id = JSON.stringify(hash_sum_1.default(ctx.path));
      if (utils_1.isImportRequest(ctx)) {
        const { css, modules } = await processCss(root, ctx);
        ctx.type = 'js';
        ctx.body = codegenCss(id, css, modules);
      }
    }
  });
  watcher.on('change', (filePath) => {
    // TODO
  });

  const processedCSS = new Map();
  // 处理css
  async function processCss(root, ctx) {
    if (ctx.__notModified && processedCSS.has(ctx.path)) {
      return processedCSS.get(ctx.path);
    }
    const css = (await utils_1.readBody(ctx.body));
    const filePath = resolver.requestToFile(ctx.path);
    const preprocessLang = (ctx.path.match(cssUtils_1.cssPreprocessLangRE) || [])[1];
    const result = await cssUtils_1.compileCss(root, ctx.path, {
      id: '',
      source: css,
      filename: filePath,
      scoped: false,
      modules: ctx.path.includes('.module'),
      preprocessLang,
      preprocessOptions: ctx.config.cssPreprocessOptions,
      modulesOptions: ctx.config.cssModuleOptions
    });
  }
}
exports.cssPlugin = cssPlugin;