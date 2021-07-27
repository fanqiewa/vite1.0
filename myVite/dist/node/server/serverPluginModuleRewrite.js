// 重新文件模块
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
/*
  lru-cache 用于在内存中管理缓存数据，并且支持LRU算法。可以让程序不依赖任何外部数据库实现缓存管理。
  LRU算法：尽量保留最近使用过的项
  可指定缓存大小
  可指定缓存项过期时间
*/
const lru_cache_1 = __importDefault(require("lru-cache"));
const magic_string_1 = __importDefault(require("magic-string"));
const es_module_lexer_1 = require("es-module-lexer");
const pluginutils_1 = require("@rollup/pluginutils");
const resolver_1 = require("../resolver");
const serverPluginHmr_1 = require("./serverPluginHmr");
const serverPluginClient_1 = require("./serverPluginClient");
const utils_1 = require("../utils");
const chalk_1 = __importDefault(require("chalk"));
const cssUtils_1 = require("../utils/cssUtils");
const serverPluginEnv_1 = require("./serverPluginEnv");
const optimizer_1 = require("../optimizer");
const babelParse_1 = require("../utils/babelParse");
const debug = require('debug')('vite:rewrite');
const rewriteCache = new lru_cache_1.default({ max: 1024 });

const moduleRewritePlugin = ({ root, app, watcher, resolver }) => {
  app.use(async (ctx, next) => {
    await next();
    // 服务端有缓存
    if (ctx.status === 304) {
      return;
    }
    // 我们正在做的js重写后，所有其他中间件已经完成；
    // 这允许我们对用户中间件生成的javascript进行后期处理，而不考虑原始文件的扩展名。
    const publicPath = ctx.path;
    if (ctx.body &&
      ctx.response.is('js') &&
      !cssUtils_1.isCSSRequest(ctx.path) &&
      !ctx.url.endWith('.map') &&
      !resolver.isPublicRequest(ctx.path) &&
      publicPath !== serverPluginClient_1.clientPublicPath &&
      !((ctx.path.endsWith('.vue') || ctx.vue) && ctx.query.type === 'style')) {
      // e.g. publicPath = '/src/main.js
      const content = await utils_1.readBody(ctx.body);
      const cacheKey = publicPath + content;
      // 是否为热更新请求
      const isHmrRequest = !!ctx.query.t;
      if (!isHmrRequest && rewriteCache.has(cachekey)) {
        debug(`(cached) ${ctx.url}`);
        ctx.body = rewriteCache.get(cacheKey);
      } else {
        await es_module_lexer_1.init;

        const importer = utils_1.removeUnRelatedHmrQuery(resolver.normalizePublicPath(ctx.url));
        ctx.body = rewriteImports(root, content, importer, resolver, ctx.query.t);
        if (!isHmrRequest) {
          rewriteCache.set(cacheKey, ctx.body);
        }
      }
    } else {
      // 跳过
      debug(`(skippend) ${ctx.url}`);
    }
  });

  // 更改文件时重写缓存 e.g. 修改.vue文件内容
  watcher.on("change", async (filePath) => {
    const publicPath = resolver.fileToRequest(filePath);
    // 读取文件
    const cacheKey = publicPath + (await fs.readFile(filePath)).toString();
    debug(`${publicPath}:cache busted`);
    // 删除缓存
    rewriteCache.del(cacheKey);
  })
}
exports.moduleRewritePlugin = moduleRewritePlugin;
function rewriteImports(root, source, importer, resolver, timestamp) {
  // 0xFEFF表示大端字节序 UTF-8 BOM
  if (source.charCodeAt(0) === 0xfeff) {
    source = source.slice(1);
  }
  try {
    let imports = [];
    try {
      imports = es_module_lexer_1.parse(source)[0];
    } catch (e) {
      console.error(chalk_1.default.yellow(`[vite] failed to parse ${chalk_1.default.cyan(importer)} for import rewrite. \nIf you are using ` +
        `JSX, make sure to named the file with the .jsx extension.`));
    }
    const hasHMR = source.includes('import.meta.hot');
    const hasEnv = source.includes('import.meta.env');
    if (imports.length || hasHMR || hasEnv) {
      debug(`${importer}:rewriting`);
      const s = new magic_string_1.default(source);
      let hasReplaced = false;
      const prevImportees = serverPluginHmr_1.importeeMap.get(importer);
      const currentImportees = new Set();
      serverPluginHmr_1.importeeMap.set(importer, currentImportees);
      for (let i = 0; i < imports.length; i++) {
        const { s: start, e: end, d: dynamicIndex, ss: expStart, se: expEnd } = imports[i];
        let id = source.substring(start, end);
        const hasViteIgnore = /\/\*\s*@vite-ignore\s*\*\//.test(id);
        let hasLiteralDynamicId = false;
        if (dynamicIndex >= 0) {
          // 移除注释
          id = id.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
          const literalIdMatch = id.match(/^\s*(?:'([^']+)'|"([^"]+)")\s*$/);
          if (literalIdMatch) {
            hasLiteralDynamicId = true;
            id = literalIdMatch[1] || literalIdMatch[2];
          }
        }
        if (dynamicIndex === -1 || hasLiteralDynamicId) {
          // 不重写外部导入
          if (utils_1.isExternalUrl(id)) {
            continue;
          }
          const resolved = exports.resolveImport(root, importer, id, resolver, timestamp);
          if (resolved !== id) {
            debug(`   "${id}" --> "${resolved}"`);
            if (isOptimizedCjs(root, id)) {
              // TODO
            } else {
              s.overwrite(start, end, hasLiteralDynamicId ? `'${resolved}'` : resolved);
            }
            hasReplaced = true;
          }
          // 保存导入链以进行hmr分析
          const importee = utils_1.cleanUrl(resolved);
          if (importee !== importer &&
            // 无需跟踪hmr客户机或模块依赖关系
            importee !== serverPluginClient_1.clientPublicPath) {
            currentImportees.add(importee);
            serverPluginHmr_1.debugHmr(`      ${importer} imports ${importee}`);
            serverPluginHmr_1.ensureMapEntry(serverPluginHmr_1.importerMap, importee).add(importer);
          }
        } else if (id !== 'import.meta' && !hasViteIgnore) {
          console.warn(chalk_1.default.yellow(`[vite] ignored dynamic import(${id}) in ${importer}.`));
        }
      }
      if (hasHMR) {
        // TODO
      }
      if (hasEnv) {
        // TODO
      }
      if (prevImportees) {
        // TODO
      }
      if (!hasReplaced) {
        debug(`    nothing needs rewriting.`);
      }
      return hasReplaced ? s.toString() : source;
    } else {
      debug(`${importer}: no imports found.`);
    }
    return source;
  } catch (e) {
    console.error(`[vite] Error: module imports rewrite failed for ${importer}.\n`, e);
    debug(source);
    return source;
  }
}
exports.rewriteImports = rewriteImports;
const resolveImport = (root, importer, id, resolver, timestamp) => {
  id = resolver.alias(id) || id;
  if (utils_1.bareImportRE.test(id)) {
    // 直接将裸模块名称解析为其入口路径，以便从中进行的相对导入（包括源映射url）可以正常工作
    id = `/@modules/${resolver_1.resolveBareModuleRequest(root, id, importer, resolver)}`;
  } else {
    // TODO
  }

  if (timestamp) {
    // TODO
  }
  return id;
};
exports.resolveImport = resolveImport;
// 分解缓存
const analysisCache = new Map();
function getAnalysis(root) {
  if (analysisCache.has(root)) {
    return analysisCache.get(root);
  }
  let analysis;
  try {
    const cacheDir = optimizer_1.resolveOptimizedCacheDir(root);
    analysis = fs.readJsonSync(path_1.default.join(cacheDir, '_analysis.json'));
  } catch (error) {
    analysis = null;
  }
  if (analysis && !utils_1.isPlainObject(analysis.isCommonjs)) {
    throw new Error(`[vite] invalid _analysis.json`);
  }
  analysisCache.set(root, analysis);
  return analysis;
}
function isOptimizedCjs(root, id) {
  const analysis = getAnalysis(root);
  if (!analysis) {
    return false;
  }
  return !!analysis.isCommonjs[id];
}