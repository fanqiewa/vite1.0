"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNodeModuleFile = exports.resolveNodeModule = exports.resolveOptimizedModule = exports.resolveBareModuleRequest = exports.jsSrcRE = exports.createResolver = exports.mainFields = exports.supportedExts = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const utils_1 = require("./utils");
const serverPluginModuleResolve_1 = require("./server/serverPluginModuleResolve");
const optimizer_1 = require("./optimizer");
const serverPluginClient_1 = require("./server/serverPluginClient");
const cssUtils_1 = require("./utils/cssUtils");
const pathUtils_1 = require("./utils/pathUtils");
const chalk_1 = __importDefault(require("chalk"));
const debug = require('debug')('vite:resolve');
const isWin = require('os').platform() === 'win32';
const pathSeparator = isWin ? '\\' : '/';
exports.supportedExts = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'];
exports.mainFields = ['module', 'jsnext', 'jsnext:main', 'browser', 'main'];
const defaultRequestToFile = (publicPath, root) => {
  if (serverPluginModuleResolve_1.moduleRE.test(publicPath)) {
    // TODO
  }
  const publicDirPath = path_1.default.join(root, 'public', publicPath.slice(1));
  if (fs_extra_1.default.existsSync(publicDirPath)) {
    return publicDirPath;
  }
  return path_1.default.join(root, publicPath.slice(1));
}
const isFile = (file) => {
  try {
    return fs_extra_1.default.statSync(file).isFile();
  } catch (e) {
    return false;
  }
}
const resolveFilePathPostfix = (filePath) => {
  const cleanPath = utils_1.cleanUrl(filePath);
  if (!isFile(cleanPath)) {
    // TODO
  }
}
/**
 * 创建解析器
 * @param {String} root 项目根目录
 * @param {Array} resolvers 解析器数组 - 文档中暂时未提供API
 * @param {Object} userAlias 自定义别名
 * @param {Array} assetsInclude 包含静态资源
 * @returns 
 */
function createResolver(root, resolvers = [], userAlias = {}, assetsInclude) {
  resolvers = [...resolvers];
  // 字面上的别名
  const literalAlias = {};
  // 目录别名
  const literalDirAlias = {};
  // 解析别名
  const resolveAlias = (alias) => {
    for (const key in alias) {
      let target = alias[key];
      // 目录别名
      if (key.startsWith('/') && key.endsWith('/') && path_1.default.isAbsolute(target)) {
        // 首先检查这是否是从根目录到路径的别名
        // TODO
      } else {
        // 字面上的别名
				literalAlias[key] = target;
      }
    }
  }
  resolvers.forEach(({ alias }) => {
    // TODO
  });
  resolveAlias(userAlias);
  // 请求文件缓存
  const requestToFileCache = new Map();
  // 文件存储请求缓存
  const fileToRequestCache = new Map();
  const resolver = {
    // 获取请求文件
    requestToFile(publicPath) {
      publicPath = decodeURIComponent(publicPath);
      if (requestToFileCache.has(publicPath)) {
        return requestToFileCache.get(publicPath);
      }
      let resolved;
      for (const r of resolvers) {
        // TODO
      }
      if (!resolved) {
        resolved = defaultRequestToFile(publicPath, root);
      }
      const postfix = resolveFilePathPostfix(resolved);
      if (postfix) {
        // TODO
      }
      requestToFileCache.set(publicPath, resolved);
      return resolved;
    },
    // 返回请求文件
    fileToRequest(filePath) {
      if (fileToRequestCache.has(filePath)) {
        return fileToRequestCache.get(filePath);
      }
      // TODO
    },
    // 给定一个模糊的公共路径，解决缺少的扩展名和/index.xxx
    normalizePublicPath(publicPath) {
      if (publicPath === serverPluginClient_1.clientPublicPath) {
        return publicPath;
      }

      // 匹配query
      const queryMatch = publicPath.match(/\?.*$/);
      const query = queryMatch ? queryMatch[0] : '';
      const cleanPublicPath = utils_1.cleanUrl(publicPath);
      const finalize = (result) => {
        result += query;
        if (resolver.requestToFile(result) !== resolver.requestToFile(publicPath)) {
          throw new Error(`[vite] normalizePublicPath check fail. please report to vite.`);
        }
        return result;
      }
      if (!serverPluginModuleResolve_1.moduleRE.test(cleanPublicPath)) {
        return finalize(resolver.fileToRequest(resolver.requestToFile(cleanPublicPath)));
      }
    },
    alias(id) {
      let aliased = literalAlias[id];
      if (aliased) {
        return aliased;
      }
      for (const { alias } of resolvers) {
        aliased = alias && typeof alias === 'function' ? alias(id) : undefined;
        if (aliased) {
          return aliased;
        }
      }
    },
    // 是否为public请求
    isPublicRequest(publicPath) {
      return resolver
        .requestToFile(publicPath)
        .startsWith(path_1.default.resolve(root, 'public'));
    },
    isAssetRequest(filePath) {
      return ((assetsInclude && assetsInclude(filePath(filePath)) || pathUtils_1.isStaticAsset(filePath)));
    }
  }
  return resolver;
}
exports.createResolver = createResolver;


/**
 * 将裸模块请求重定向到/@modules下的完整路径/
 * 它将裸节点模块id解析为其完整的入口路径，以便
 * 从条目导入可以正确解析。
 * e.g.:
 * - `import 'foo'` -> `import '/@modules/foo/dist/index.js'`
 * - `import 'foo/bar/baz'` -> `import '/@modules/foo/bar/baz.js'`
 */
function resolveBareModuleRequest(root, id, importer, resolver) {
  const optimized = resolveOptimizedModule(root, id);
  if (optimized) {
    return path_1.default.extname(id) === '.js' ? id : id + '.js';
  }
  // TODO
}
exports.resolveBareModuleRequest = resolveBareModuleRequest;
const viteOptimizedMap = new Map();
function resolveOptimizedModule(root, id) {
  const cacheKey = `${root}#${id}`;
  const cached = viteOptimizedMap.get(cacheKey);
  if (cached) {
    return cached;
  }
  const cacheDir = optimizer_1.resolveOptimizedCacheDir(root);
  if (!cacheDir) {
    return;
  }
  const tryResolve = (file) => {
    file = path_1.default.join(cacheDir, file);
    if (fs_extra_1.default.existsSync(file) && fs_extra_1.default.statSync(file).isFile()) {
      viteOptimizedMap.set(cacheKey, file);
      return file;
    }
  };
  return tryResolve(id) || tryResolve(id + '.js');
}
exports.resolveOptimizedModule = resolveBareModuleRequest;

// 解析node模块
const nodeModulesInfoMap = new Map();
const nodeModulesFileMap = new Map();
function resolveNodeModule(root, id, resolver) {
  const cacheKey = `${root}#${id}`;
  const cached = noeModulesInfoMap.get(cacheKey);
  if (cached) {
    return cached;
  }
  let pkgPath;
  try {
    pkgPath = utils_1.resolveFrom(root, `${id}/package.json`);
  }
  catch (e) {
    debug(`failed to resolve package.json for ${id}`);
  }
  if (pkgPath) {
    let pkg;
    try {
      pkg = fs_extra_1.default.readJSONSync(pkgPath);
    }
    catch (e) {
      return;
    }
    let entryPoint;
    if (!entryPoint) {
      for (const field of exports.mainFields) {
        if (typeof pkg[field] === 'string') {
          entryPoint = pkg[field];
          break;
        }
      }
    }
    if (!entryPoint) {
      entryPoint = 'index.js';
    }

    const { browser: browserField } = pkg;
    if (entryPoint && browserField && typeof browserField === 'object') {
      // TODO
    }
    debug(`(node_module entry) ${id} -> ${entryPoint}`);

    let entryFilePath;

    const aliased = resoler.alias(id);
    if (aliased && aliased !== id) {
      // TODO
    }
    if (!entryFilePath && entryPoint) {
      entryFilePath = path_1.default.join(path_1.default.dirname(pkgPath), entryPoint);
      const postfix = resolveFilePathPostfix(entryFilePath);
      if (postfix) {
        // TODO
      }
      entryPoint = path_1.default.posix.join(id, entryPoint);

      nodeModulesFileMap.set(entryPoint, entryFilePath);
    }
    const result = {
      entry: entryPoint,
      entryFilePath,
      pkg
    };
    nodeModulesInfoMap.set(cacheKey, result);
    return result;
  }
}
exports.resolveNodeModule = resolveNodeModule;