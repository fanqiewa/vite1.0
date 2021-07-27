"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const p_map_series_1 = __importDefault(require("p-map-series"));
const json_1 = require("klona/json");
const utils_1 = require("../utils");
const resolver_1 = require("../resolver");
const buildPluginResolve_1 = require("./buildPluginResolve");
const buildPluginHtml_1 = require("./buildPluginHtml");
const buildPluginCss_1 = require("./buildPluginCss");
const buildPluginAsset_1 = require("./buildPluginAsset");
const buildPluginEsbuild_1 = require("./buildPluginEsbuild");
const buildPluginReplace_1 = require("./buildPluginReplace");
const config_1 = require("../config");
const transform_1 = require("../transform");
const hash_sum_1 = __importDefault(require("hash-sum"));
const cssUtils_1 = require("../utils/cssUtils");
const buildPluginWasm_1 = require("./buildPluginWasm");
const buildPluginManifest_1 = require("./buildPluginManifest");
const esbuildService_1 = require("../esbuildService");

// 自定义rollup警告函数
function onRollupWarning(spinner, options) {
	return (warning, warn) => {
		if (warning.code === 'UNRESOLVED_IMPORT') {
			let message;
			const id = warning.source;
			const importer = warning.importer;
			if (isBuiltin(id)) {
				let importingDep;
				if (importer) {
					const pkg = JSON.parse(utils_1.lookupFile(importer, ['package.json']) || `{}`);
					if (pkg.name) {
						importingDep = pkg.name;
					}
				}
				const allowList = options.allowNodeBuiltins;
				if (importingDep && allowList && allowList.includes(importingDep)) {
					return;
				}
				const dep = importingDep
					? `Dependency ${chalk_1.default.yellow(importingDep)}`
					: `A dependency`;
				message =
					`${dep} is attempting to import Node built-in module ${chalk_1.default.yellow(id)}.\n` +
					`This will not work in a browser environment.\n` +
					`Imported by: ${chalk_1.default.gray(importer)}`;
			}
			else {
				message =
					`[vite]: Rollup failed to resolve import "${warning.source}" from "${warning.importer}".\n` +
					`This is most likely unintended because it can break your application at runtime.\n` +
					`If you do want to externalize this module explicitly add it to\n` +
					`\`rollupInputOptions.external\``;
			}
			if (spinner) {
				spinner.stop();
			}
			throw new Error(message);
		}
		if (warning.plugin === 'rollup-plugin-dynamic-import-variables' &&
			dynamicImportWarningIgnoreList.some((msg) => warning.message.includes(msg))) {
			return;
		}
		if (!warningIgnoreList.includes(warning.code)) {
			// ora would swallow the console.warn if we let it keep running
			// https://github.com/sindresorhus/ora/issues/90
			if (spinner) {
				spinner.stop();
			}
			warn(warning);
			if (spinner) {
				spinner.start();
			}
		}
	};
}
exports.onRollupWarning = onRollupWarning;

// 创建rollup插件
async function createBaseRollupPlugins(root, resolver, options) {
  const { transforms = [], vueCustomBlockTransforms = {}, enableEsbuild = true, enableRollupPluginVue = true } = options;
  const { nodeResolve } = require('@rollup/plugin-node-resolve');
  const dynamicImport = require('rollup-plugin-dynamic-import-variables');
  return [
    // vite:resolve
    buildPluginResolve_1.createBuildResolvePlugin(root, resolver),
    // vite:esbuild
    enableEsbuild ? await buildPluginEsbuild_1.createEsbuildPlugin(options.jsx) : null,
    // vue
    enableRollupPluginVue ? await createVuePlugin(root, options) : null,
  ]
}
exports.createBaseRollupPlugins = createBaseRollupPlugins;
async function createVuePlugin(root, { vueCustomBlockTransforms = {}, rollupPluginVueOptions, cssPreprocessOptions, cssModuleOptions, vueCompilerOptions, vueTransformAssetUrls = {}, vueTemplatePreprocessOptions = {} }) {
  // TODO
}
// 准备config
function prepareConfig(config) {
  const { alias = {}, assetsDir = '_assets', assetsInclude = utils_1.isStaticAsset, assetsInlineLimit = 4096, base = '/', cssCodeSplit = true, cssModuleOptions = {}, cssPreprocessOptions = {}, define = {}, emitAssets = true, emitIndex = true, enableEsbuild = true, enableRollupPluginVue = true, entry = 'index.html', env = {}, esbuildTarget = 'es2020', indexHtmlTransforms = [], jsx = 'vue', minify = true, mode = 'production', optimizeDeps = {}, outDir = 'dist', resolvers = [], rollupDedupe = [], rollupInputOptions = {}, rollupOutputOptions = {}, rollupPluginVueOptions = {}, root = process.cwd(), shouldPreload = null, silent = false, sourcemap = false, terserOptions = {}, transforms = [], vueCompilerOptions = {}, vueCustomBlockTransforms = {}, vueTransformAssetUrls = {}, vueTemplatePreprocessOptions = {}, write = true } = json_1.klona(config);
  return {
    ...config,
    alias,
    assetsDir,
    assetsInclude,
    assetsInlineLimit,
    base,
    cssCodeSplit,
    cssModuleOptions,
    cssPreprocessOptions,
    define,
    emitAssets,
    emitIndex,
    enableEsbuild,
    enableRollupPluginVue,
    entry,
    env,
    esbuildTarget,
    indexHtmlTransforms,
    jsx,
    minify,
    mode,
    optimizeDeps,
    outDir,
    resolvers,
    rollupDedupe,
    rollupInputOptions,
    rollupOutputOptions,
    rollupPluginVueOptions,
    root,
    shouldPreload,
    silent,
    sourcemap,
    terserOptions,
    transforms,
    vueCompilerOptions,
    vueCustomBlockTransforms,
    vueTransformAssetUrls,
    vueTemplatePreprocessOptions,
    write
  };

}

// 跟踪并行生成调用，并仅在所有生成完成时停止esbuild服务。
let parallelCallCounts = 0;
// build入口
async function build(options) {
  parallelCallCounts++;
  try {
    return await doBuild(options);
  } finally {
    parallelCallCounts--;
    if (parallelCallCounts <= 0) {
      await esbuildService_1.stopService();
    }
  }
}
exports.build = build;
// 开始build
async function doBuild(options) {
  const builds = [];
  const config = prepareConfig(options);
  const postBuildHooks = utils_1.toArray(config.configureBuild)
    .map((configureBuild) => configureBuild(config, builds))
    .filter(Boolean);
  const { root, assetsDir, assetsInlineLimit, emitAssets, minify, silent, sourcemap, shouldPreload, env, mode: configMode, define: userDefineReplacements, write } = config;
  const isTest = process.env.NODE_ENV === 'text';
  // 模式 默认值 production
  const resolvedMode = process.env.VITE_ENV || configMode;
  process.env.NODE_ENV =
    resolvedMode === 'text' || resolvedMode === 'development'
      ? resolvedMode
      : 'production';
  const start = Date.now();
  let spinner;
  const msg = `Building ${configMode} bundle...`;
  if (!silent /* 是否打印日志*/) {
    if (process.env.DEBUG || isTest) {
      console.log(msg);
    } else {
      // ora显示加载效果
      // Building production bundle...
      spinner = require('ora')(msg + '\n').start();
    }
  }
  // 输出目录
  const outDir = path_1.default.resolve(root, config.outDir);
  // 模板文件路径
  const indexPath = path_1.default.resolve(root, 'index.html');
  // 公共资源目录
  const publicDir = path_1.default.join(root, 'public');
  // 基路径 e.g. '/'
  const publicBasePath = config.base.replace(/([^/])$/, '$1');
  // 静态资源路径 e.g. '_assets'
  const resolvedAssetsPath = path_1.default.join(outDir, assetsDir);
  // 解析器
  const resolver = resolver_1.createResolver(root, config.resolvers, config.alias, config.assetsInclude);
  // c创建htmlPlugin
  const { htmlPlugin, renderIndex } = await buildPluginHtml_1.createBuildHtmlPlugin(root, indexPath, publicBasePath, assetsDir, assetsInlineLimit, resolver, shouldPreload, options);
  // 基础的plugin
  const basePlugins = await createBaseRollupPlugins(root, resolver, config);
  basePlugins.splice(basePlugins.findIndex((p) => p.name.includes('node-resolve')), 0, require('rollup-plugin-web-worker-loader')({
    targetPlateform: 'browser',
    pattern: /(.+)\?worker$/,
    extensions: resolver_1.supportedExts,
    sourcemap: false
  }));

  const userClientEnv = {};
  const userEnvReplacements = {};
  Object.keys(env).forEach((key) => {
    // TODO
  });
  const builtInClientEnv = {
    BASE_URL: publicBasePath,
    MODE: configMode,
    DEV: resolvedMode !== 'production',
    PROD: resolvedMode === 'production'
  };
  const builtInEnvReplacements = {};
  Object.keys(builtInClientEnv).forEach((key) => {
    builtInEnvReplacements[`import.meta.env.${key}`] = JSON.stringify(builtInClientEnv[key]);
  });
  Object.keys(userDefineReplacements).forEach((key) => {
    userDefineReplacements[key] = JSON.stringify(userDefineReplacements[key]);
  });
  Object.keys(userDefineReplacements).forEach((key) => {
    userDefineReplacements[key] = JSON.stringify(userDefineReplacements[key]);
  });
  const { pluginsPreBuild = [], plugins = [], pluginsPostBuild = [], pluginsOptimizer, ...rollupInputOptions } = config.rollupInputOptions;
  builds.unshift({
    input: config.entry,
    preserveEntrySignatures: false,
    treeshake: { moduleSideEffects: 'no-external' },
    ...rollupInputOptions,
    output: config.rollupOutputOptions,
    plugins: [
      ...plugins,
      ...pluginsPreBuild,
      ...basePlugins,
      // vite:html
      htmlPlugin,
      buildPluginReplace_1.createReplacePlugin((id) => !/\?vue&type=template/.test(id) &&
        // 为了提高性能，还排除了css和静态资产
        !cssUtils_1.isCSSRequest(id) &&
        !resolver.isAssetRequest(id), {
        ...config_1.defaultDefines,
        ...userDefineReplacements,
        ...userEnvReplacements,
        ...builtInEnvReplacements,
        'import.meta.env.': `({}).`,
        'import.meta.env': JSON.stringify({
          ...userClientEnv,
          ...builtInClientEnv
        }),
        'process.env.NODE_ENV': JSON.stringify(resolvedMode),
        'process.env.': `({}).`,
        'process.env': JSON.stringify({ NODE_ENV: resolvedMode }),
        'import.meta.hot': `false`
      }, !!sourcemap),
      // vite:css
      buildPluginCss_1.createBuildCssPlugin({
        root,
        publicBase: publicBasePath,
        assetsDir,
        minify,
        inlineLimit: assetsInlineLimit,
        cssCodeSplit: config.cssCodeSplit,
        preprocessOptions: config.cssPreprocessOptions,
        modulesOptions: config.cssModuleOptions
      }),
      // vite:wasm
      buildPluginWasm_1.createBuildWasmPlugin(root, publicBasePath, assetsDir, assetsInlineLimit),
      // vite:asset
      buildPluginAsset_1.createBuildAssetPlugin(root, resolver, publicBasePath, assetsDir, assetsInlineLimit),
      config.enableEsbuild &&
      buildPluginEsbuild_1.createEsbuildRenderChunkPlugin(config.esbuildTarget, minify === 'esbuild'),
      config.enableEsbuild &&
      buildPluginEsbuild_1.createEsbuildRenderChunkPlugin(config.esbuildTarget, minify === 'esbuild'),
      minify && minify !== 'esbuild'
        ? require('rollup-plugin-terser').terser(config.terserOptions)
        : undefined,
      ...pluginsPostBuild,
      config.emitManifest ? buildPluginManifest_1.createBuildManifestPlugin() : undefined
    ].filter(Boolean)
  });

  const rollup = require('rollup').rollup;
  const results = await p_map_series_1.default(builds, async (build, i) => {
    const { output: outputOptions, onResult, ...inputOptions } = build;
    let result;
    let indexHtml;
    let indexHtmlPath = getIndexHtmlOutputPath(build);
    const emitIndex = config.emitIndex && indexHtmlPath !== null;
    try {
      const bundle = await rollup({
				onwarn: onRollupWarning(spinner, config.optimizeDeps),
				...inputOptions,
				plugins: [
					...(inputOptions.plugins || []).filter(
						(plugin) => plugin.name !== 'vite:emit'),
					createEmitPlugin(emitAssets, async (assets) => {
						indexHtml = emitIndex ? await renderIndex(assets) : '';
						result = { build, assets, html: indexHtml };
						if (onResult) {
							await onResult(result);
						}
						await postBuildHooks.reduce((queue, hook) => queue.then(() => hook(result)), Promise.resolve());
						if (write) {
							if (i === 0) {
								await fs_extra_1.default.emptyDir(outDir);
							}
							if (emitIndex) {
								indexHtmlPath = path_1.default.resolve(outDir, indexHtmlPath);
                // 写入文件
								await fs_extra_1.default.writeFile(indexHtmlPath, indexHtml);
							}
						}
					})
				]
      });
			await bundle[write ? 'write' : 'generate']({
				dir: resolvedAssetsPath,
				format: 'es',
				sourcemap,
				entryFileNames: `[name].[hash].js`,
				chunkFileNames: `[name].[hash].js`,
				assetFileNames: `[name].[hash].[ext]`,
				namespaceToStringTag: true,
				...outputOptions
			});
    }
		finally {
			spinner && spinner.stop();
		}
    if (write && !silent) {
      if (emitIndex) {
        printFileInfo(indexHtmlPath, indexHtml, 3 /* HTML */);
      }
      for (const chunk of result.assets) {
        if (chunk.type === 'chunk') {
          const filePath = path_1.default.join(resolvedAssetsPath, chunk.fileName);
          printFileInfo(filePath, chunk.code, 0 /* JS */);
					if (chunk.map) {
						printFileInfo(filePath + '.map', chunk.map.toString(), 4 /* SOURCE_MAP */);
					}
        } else if (emitAssets && chunk.source) {
          // 输出静态资源信息
          printFileInfo(path_1.default.join(resolvedAssetsPath, chunk.fileName), chunk.source, chunk.fileName.endsWith('.css') ? 1 /* CSS */ : 2 /* ASSET */);
        }
      }
      spinner && spinner.start();
      return result;
    }
  });
  if (write && emitAssets && fs_extra_1.default.existsSync(publicDir)) {
    for (const file of await fs_extra_1.default.readdir(publicDir)) {
      await fs_extra_1.default.copy(path_1.default.join(publicDir, file), path_1.default.resolve(outDir, file));
    }
  }
  spinner && spinner.stop();
  if (!silent) {
    console.log(`Build completed in ${((Date.now() - start) / 1000).toFixed(2)}s.\n`);
  }
  return results;
}

function createEmitPlugin(emitAssets, emit) {
	return {
		name: 'vite:emit',
		async generateBundle(_, output) {
			const assets = Object.values(output);
			await emit(assets);
			for (const asset of assets) {
				output[asset.fileName] = asset;
			}
			if (!emitAssets) {
				for (const name in output) {
					if (output[name].type === 'asset') {
						delete output[name];
					}
				}
			}
		}
	};
}

function getIndexHtmlOutputPath(build) {
  const { input, output } = build;
  return input === 'index.html' ? output.file || input : null;
}

// 打印文件信息
function printFileInfo(filePath, content, type) {
  const needCompression = type === 0 /* JS */ || type === 1 /* CSS */ || type === 3 /* HTML */;
  const compressed = needCompression
    ? `, brotli: ${(require('brotli-size').sync(context) / 1024).toFixed(2)}kb`
    : ``;
	console.log(`${chalk_1.default.gray(`[write]`)} ${writeColors[type](path_1.default.relative(process.cwd(), filePath))} ${(content.length / 1024).toFixed(2)}kb${compressed}`);
}