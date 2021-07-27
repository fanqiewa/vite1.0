"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOptimizedCacheDir = exports.getDepHash = exports.optimizeDeps = exports.OPTIMIZE_CACHE_DIR = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const resolver_1 = require("../resolver");
const build_1 = require("../build");
const utils_1 = require("../utils");
//  ES Module 语句的快速词法分析
const es_module_lexer_1 = require("es-module-lexer");
const chalk_1 = __importDefault(require("chalk"));
const pluginAssets_1 = require("./pluginAssets");
const entryAnalysisPlugin_1 = require("./entryAnalysisPlugin");
const debug = require('debug')('vite:optimize');
const KNOWN_IGNORE_LIST = new Set([
  'vite',
  'vitepress',
  'tailwindcss',
  '@tailwindcss/ui',
  '@pika/react',
  '@pika/react-dom'
]);
exports.OPTIMIZE_CACHE_DIR = `node_modules/.vite_opt_cache`;
// 依赖优化选项
async function optimizeDeps(config, asCommand = false) {
  const log = asCommand ? console.log : debug;
  const root = config.root || process.cwd();
  if (fs_extra_1.default.existsSync(path_1.default.join(root, 'web_modules'))) {
    console.warn(chalk_1.default.yellow(`[vite] vite 0.15 has built-in dependency pre-bundling and resolving ` +
      `from web_modules is no longer supported.`));
  }
  // package路径
  const pkgPath = utils_1.lookupFile(root, [`package.json`], true);
  if (!packPath) {
    log(`package.json not found. Skipping.`);
    return;
  }
  // .vite_opt_cache
  const cacheDir = resolveOptimizedCacheDir(root, pkgPath);
  // .vite_opt_cache/hash
  const hashPath = path_1.default.join(cacheDir, 'hash');
  // 转成hash
  const depHash = getDepHash(root, config.__path);
  /**
   * 强制使依赖预构建
   * Server-API:
   *  - server.force
   */
  if (!config.force) {
    let prevhash;
    try {
      prevhash = await fs_extra_1.default.readFile(hashPath, 'utf-8');
    } catch (e) { }

    if (prevhash === depHash) {
      // hash值一致，不需要重新预构建。
      // 如果想要强制使依赖预构建，则添加配置 force
      log('Hash is consistent. Skipping. Use --force to override.');
      return;
    }
  }
  await fs_extra_1.default.remove(cacheDir);
  await fs_extra_1.default.ensureDir(cacheDir);
  const options = config.optimizeDeps || {};
  const resolver = resolver_1.createResolver(root, config.resolvers, config.alias, config.assetsInclude);

  await es_module_lexer_1.init;

  const { qualified, external } = resolveQualifiedDeps(root, options, resolver);
  if (options.link) {
    // TODO
  }
  if (options.include) {
    // TODO
  }
  if (!Object.keys(qualified).length) {
    // TODO
  }
  // 输出被优化的依赖包
  if (!asCommand) {
    console.log(chalk_1.default.greenBright(`[vite] Optimizable dependencies detected:`));
    console.log(Object.keys(qualified)
      .map((id) => chalk_1.default.yellow(id))
      .join(`, `));
  }
  let spinner;
  const msg = asCommand
    ? `Pre-bundling dependencies to speed up dev server page load...`
    : `Pre-bundling them to speed up dev server page load...\n` +
    `(this will be run only when your dependencies have changed)`;
  if (process.env.DEBUG || process.env.NODE_ENV === 'test') {
    console.log(msg);
  } else {
    spinner = require('ora')(msg + '\n').start();
  }

  const { pluginsPreBuild, pluginsPostBuild, pluginsOptimizer = [], ...rollupInputOptions } = config.rollupInputOptions;
  try {
    const rollup = require('rollup');
    const bundle = await rollup.rollup({
      input: qualified,
      external,
      onwarn: build_1.onRollupWarning(spinner, options),
      ...rollupInputOptions,
      plugins: [
        pluginAssets_1.createDepAssetExternalPlugin(resolver),
        entryAnalysisPlugin_1.entryAnalysisPlugin(),
        ...(await build_1.createBaseRollupPlugins(root, resolver, config)),
        pluginAssets_1.createDepAssetPlugin(resolver, root),
        ...pluginsOptimizer
      ]
    });

    const { output } = await bundle.generate({
      ...config.rollupOutputOptions,
      format: 'es',
      exports: 'named',
      entryFileNames: '[name].js',
      chunkFileNames: 'common/[name]-[hash].js'
    });
    spinner && spinner.stop();
    for (const chunk of output) {
      if (chunk.type === 'chunk') {
        const fileName = chunk.fileName;
        const filePath = path_1.default.join(cacheDir, fileName);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(filePath));
        await fs_extra_1.default.writeFile(filePath, chunk.code);
      }
      if (chunk.type === 'asset' && chunk.fileName === '_analysis.json') {
        const filePath = path_1.default.join(cacheDir, chunk.fileName);
        await fs_extra_1.default.writeFile(filePath, chunk.source);
      }
    }
    await fs_extra_1.default.writeFile(hashPath, depHash);
  } catch (e) {
    spinner && spinner.stop();
    if (asCommand) {
      throw e;
    } else {
      console.error(chalk_1.default.red(`\n[vite] Dep optimization failed with error:`));
      console.error(chalk_1.default.red(e.message));
      if (e.code === 'PARSE_ERROR') {
        console.error(chalk_1.default.cyan(path_1.default.relative(root, e.loc.file)));
        console.error(chalk_1.default.dim(e.frame));
      } else if (e.message.match('Node built-in')) {
        console.log();
        console.log(chalk_1.default.yellow(`Tip:\nMake sure your "dependencies" only include packages that you\n` +
          `intend to use in the browser. If it's a Node.js package, it\n` +
          `should be in "devDependencies".\n\n` +
          `If you do intend to use this dependency in the browser and the\n` +
          `dependency does not actually use these Node built-ins in the\n` +
          `browser, you can add the dependency (not the built-in) to the\n` +
          `"optimizeDeps.allowNodeBuiltins" option in vite.config.js.\n\n` +
          `If that results in a runtime error, then unfortunately the\n` +
          `package is not distributed in a web-friendly format. You should\n` +
          `open an issue in its repo, or look for a modern alternative.`)
        );
      } else {
        console.error(e);
      }
      process.exit(1);
    }
  }
}
exports.optimizeDeps = optimizeDeps;
// 解析符合条件的依赖
function resolveQualifiedDeps(root, options, resolver) {
  const { include /* 使用此选项可强制预构建链接的包。 */, exclude /* 在预构建中强制排除的依赖项。 */, link } = options;
  const pkgContent = utils_1.lookupFile(root, ['package.json']);
  if (!pkgContent) {
    return {
      qualified: {}, // 有条件的
      external: []
    };
  }
  const pkg = JSON.parse(pkgContent);
  // dependencies依赖
  const deps = Object.keys(pkg.dependencies || {});
  const qualifiedDeps = deps.filter((id) => {
    if (include && include.includes(id)) {
      // 已经包含
      return false;
    }
    if (exclude && exclude.include.includes(id)) {
      debug(`skipping ${id} (excluded)`);
      return false;
    }
    if (link && link.includes(id)) {
      debug(`skipping ${id} (link)`);
      return false;
    }
    // 已知的忽略列表
    if (KNOWN_IGNORE_LIST.has(id)) {
      debug(`skipping ${id} (internal excluded)`);
      return false;
    }
    if (id.startsWith('@types/')) {
      debug(`skipping ${id} (ts declaration)`);
      return false;
    }
    const pkgInfo = resolver_1.resolveNodeModule(root, id, resolver);
    if (!pkgInfo || !pkgInfo.entryFilePath) {
      debug(`skipping ${id} (cannot resolve entry)`);
      console.log(root, id);
      console.error(chalk_1.default.yellow(`[vite] cannot resolve entry for dependency ${chalk_1.default.cyan(id)}.`));
      return false;
    }
    // 入口文件路径
    const { entryFilePath } = pkgInfo;
    // 判断入口文件是否为Js类型
    if (!resolver_1.supportedExts.includes(path_1.default.extname(entryFilePath))) {
      debug(`skipping ${id} (entry is not js)`);
      return false;
    }
    // 判断入口文件是否存在
    if (!fs_extra_1.default.existsSync(entryFilePath)) {
      debug(`skipping ${id} (entry file does not exist)`);
      console.error(chalk_1.default.yellow(`[vite] dependency ${id} declares non-existent entry file ${entryFilePath}.`));
      return false;
    }
    const content = fs_extra_1.default.readFileSync(entryFilePath, 'utf-8');
    const [imports, exports] = es_module_lexer_1.parse(content);
    // 入口文件没有exports
    if (!exports.length && !/export\s+\*\s+from/.test(content)) {
      debug(`optimizing ${id} (no exports, likely commonjs)`);
      return true;
    }
    for (const { s, e } of imports) {
      let i = content.slice(s, e).trim();
      i = resolver.alias(i) || i;
      // imports含有相对路径
      if (i.startsWith('.')) {
        debug(`optimizing ${id} (contains relative imports)`);
        return true;
      }
      // 引入子目录
      if (!deps.includes(i)) {
        debug(`optimizing ${id} (import sub dependencies)`);
        return true;
      }
    }
    debug(`skipping ${id} (single esm file, doesn't need optimization)`);
  });
  const qualified = {};
  qualifiedDeps.forEach((id) => {
    qualified[id] = resolver_1.resolveNodeModule(root, id, resolver).entryFilePath;
  });
  const external = deps
    .filter((id) => !qualifiedDeps.includes(id))
    .map((id) => resolver.alias(id) || id);

  return {
    qualified,
    external
  };
}
const lockfileFormats = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
let cachedHash;
// 获取依赖hash
function getDepHash(root, configPath) {
  if (cachedHash) {
    return cachedHash;
  }
  // package-lock.json的内容
  let content = utils_1.lookupFile(root, lockfileFormats) || '';
  // package.json内容
  const pkg = JSON.parse(utils_1.lookupFile(root, [`package.json`]) || '{}');
  // package.json的dependensies内容
  content += JSON.stringify(pkg.dependencies);

  // vite.config.js的内容
  if (configPath) {
    content += fs_extra_1.default.readFileSync(configPath, 'utf-8');
  }
  return crypto_1.createHash('sha1').update(content).digest('base64');
}
const cacheDirCache = new Map();
// 缓存依赖优化文件
function resolveOptimizedCacheDir(root, pkgPath) {
  const cached = cacheDirCache.get(root);
  if (cached !== undefined) {
    return cached;
  }
  pkgPath = pkgPath || utils_1.lookupFile(root, [`package.json`], true);
  if (!pkgPath) {
    return null;
  }
  const cacheDir = path_1.default.join(path_1.default.dirname(pkgPath), exports.OPTIMIZE_CACHE_DIR);
  cacheDirCache.set(root, cacheDir);
  return cacheDir;
}