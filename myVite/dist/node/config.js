'use strict';
// 导出模块
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDefines = exports.loadEnv = exports.resolveConfig = void 0;
// nodejs path模块
const path_1 = __importDefault(require("path"));
// fs模块的扩展
const fs_extra_1 = __importDefault(require("fs-extra"));
// 修改控制台字体样式
const chalk_1 = __importDefault(require("chalk"));
// 从文件加载环境变量
const dotenv_1 = __importDefault(require("dotenv"));
// 扩展计算机上已经存在的环境变量
const dotenv_expand_1 = __importDefault(require("dotenv-expand"));
const buildPluginEsbuild_1 = require("./build/buildPluginEsbuild");
const resolver_1 = require("./resolver");
const utils_1 = require("./utils");
// debug调试
const debug = require('debug')('vite:config');
// 解析vue.vite.config.js文件
async function resolveConfig(mode, configPath) {
  // 定义开始时间
  const start = Date.now();
  const cwd = process.cwd();
  let resolvedPath;
  let isTS = false;

  if (configPath) {
    // 显式地通过 --config配置文件路径
    resolvedPath = path_1.default.resolve(cwd, configPath);
  } else {
    const jsConfigPath = path_1.default.resolve(cwd, 'vite.config.js');
    if (fs_extra_1.default.existsSync(jsConfigPath)) {
      // js类型
      resolvedPath = jsConfigPath;
    } else {
      const tsConfigPath = path_1.default.resolve(cwd, 'vite.config.ts');
      if (fs_extra_1.default.existsSync(tsConfigPath)) {
        // ts类型
        isTS = true;
        resolvedPath = tsConfigPath;
      }
    }
  }

  if (!resolvedPath) {
    // 如果没有默认的vite.config.js和显示的配置config路径，则加载环境变量
    return {
      env: loadEnv(mode, cwd)
    }
  }

  try {
    let userConfig;
    if (!isTS) {
      try {
        userConfig = require(resolvedPath);
      } catch (e) {
        const ignored = /Cannot use import statement|Unexpected token 'export'|Must use import to load ES Module/;
        if (!ignored.test(e.message)) {
          throw e;
        }
      }
    }

    if (!userConfig) {
      // 如果我们到达这里，文件是ts或使用es import语法，
      // 或者用户在package.json中有类型：“module”

      // e.g. vite.config.ts
			const rollup = require('rollup');
      const esbuildPlugin = await buildPluginEsbuild_1.createEsbuildPlugin({});
      const esbuildRenderChunkPlugin = buildPluginEsbuild_1.createEsbuildRenderChunkPlugin('es2019', false);
      // 使用node解析来支持.ts文件
      const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve({
        extensions: resolver_1.supportedExts
      });
      const bundle = await rollup.rollup({
        external: (id) => (id[0] !== '.' && !path_1.default.isAbsolute(id) ||
          id.slice(-5, id.length) === '.json'),
        input: resolvedPath,
        treeshake: false,
				plugins: [esbuildPlugin, nodeResolve, esbuildRenderChunkPlugin]
      });
      const { output: [{ code }] } = await bundle.generate({
        exports: 'named',
        format: 'cjs'
      });
      userConfig = await loadConfigFromBundledFile(resolvedPath, code);
    }
    
    let config = (typeof userConfig === 'function'
      ? userConfig(mode)
      : userConfig);
    // 解析plugins
    if (config.plugins) {
      for (const plugin of config.plugins) {
        config = resolvePlugin(config, plugin);
      }
    }

    // 格式化根
    if (config.root && !path_1.default.isAbsolute(config.root)) {
      config.root = path_1.default.resolve(path_1.default.dirname(resolvedPath), config.root);
    }
    // vue转换静态资源
    if (typeof config.vueTransformAssetUrls === 'object') {
      config.vueTransformAssetUrls = normalizeAssetUrlOptions(config.vueTransformAssetUrls);
    }
    const env = loadEnv(mode, config.root || cwd);
    config.env = {
      ...config.env,
      ...env
    };
    debug(`config resolved in ${Date.now() - start}ms`);
    config.__path = resolvedPath;
    return config;
  } catch (e) {
    console.error(chalk_1.default.red(`[vite] failed to load config from ${resolvedPath}:`));
    console.error(e);
    process.exit(1);
  }
}
exports.resolveConfig = resolveConfig;
async function loadConfigFromBundledFile(fileName, bundledCode) {
  // 文件后缀 e.g. .ts
  const extension = path_1.default.extname(fileName);
  const defaultLoader = require.extensions[extension];
  require.extensions[extension] = (module, filename) => {
    if (fileName === fileName) {
      module._compile(bundledCode, filename);
    } else {
			defaultLoader(module, filename);
    }
  };
  delete require.cache[fileName];
  const raw = require(fileName);
  const config = raw.__esModule ? raw.default : raw;
  require.extensions[extension] = defaultLoader;
  return config;
}
// 解析插件
function resolvePlugin(config, plugin) {
  return {
    ...config,
    ...plugin,
    alias: {
      ...plugin.alias,
      ...config.alias
    },
    // 定义全局变量替换方式。每项在开发时会被定义为全局变量，而在构建时则是静态替换。
    define: {
      ...plugin.define,
      ...config.define
    },
    // 转换函数
    transforms: [...(config.transforms || []), ...(plugin.transforms || [])],
    indexHtmlTransforms: [
      ...(config.indexHtmlTransforms || []),
      ...(config.indexHtmlTransforms || [])
    ],
    resolvers: [...(config.resolver || []), ...(plugin.resolver || [])],
    configureServer: [].concat(config.configureServer || [], plugin.configureServer || []),
    configureBuild: [].concat(config.configureBuild || [], plugin.configureBuild || []),
    vueCompilerOptions: {
      ...config.vueCompilerOptions,
      ...plugin.vueCompilerOptions
    },
    vueTransformAssetUrls: mergeAssetUrlOptions(config.vueTransformAssetUrls, plugin.vueTransformAssetUrls),
		vueTemplatePreprocessOptions: {
			...config.vueTemplatePreprocessOptions,
			...plugin.vueTemplatePreprocessOptions
		},
		vueCustomBlockTransforms: {
			...config.vueCustomBlockTransforms,
			...plugin.vueCustomBlockTransforms
		},
		rollupInputOptions: mergeObjectOptions(config.rollupInputOptions, plugin.rollupInputOptions),
		rollupOutputOptions: mergeObjectOptions(config.rollupOutputOptions, plugin.rollupOutputOptions),
		enableRollupPluginVue: config.enableRollupPluginVue || plugin.enableRollupPluginVue
  }
}
function mergeAssetUrlOptions(to, from) {
  if (from === true) {
    return to;
  }
  if (from === false) {
    return from;
  }
  if (typeof to === 'boolean') {
    return from || to;
  }
	return {
		...normalizeAssetUrlOptions(to),
		...normalizeAssetUrlOptions(from)
	};
}
// 格式化静态资源转换options
function normalizeAssetUrlOptions(o) {
  if (o && Object.keys(o).some((key) => Array.isArray(o[key]))) {
    // o是个对象且该对象中有属性值为数组
    return {
      tags: o
    };
  } else {
    return o;
  }
}
// 合并对象
function mergeObjectOptions(to, from) {
	if (!to)
		return from;
	if (!from)
		return to;
	const res = { ...to };
	for (const key in from) {
		const existing = res[key];
		const toMerge = from[key];
		if (Array.isArray(existing) || Array.isArray(toMerge)) {
			res[key] = [].concat(existing, toMerge).filter(Boolean);
		}
		else {
			res[key] = toMerge;
		}
	}
	return res;
}
// 加载.env配置文件
function loadEnv(mode, root, prefix = 'VITE_') {
  if (mode === 'local') {
    // “local”不能用作模式名，因为它与.env文件的.local后缀冲突。
    throw new Error(`"local" cannot be used as a mode name because it conflicts with ` +
      `the .local postfix for .env files.`);
  }
  debug(`env mode: ${mode}`);
  const env = {};
  // 环境变量文件名称
  const envFiles = [
    /* mode local file */`.env.${mode}.local`,
    /* mode file */`.env.${mode}`,
    /* local file */`.env.local`,
    /* default file */`.env`
  ];
  for (const file of envFiles) {
    const path = utils_1.lookupFile(root, [file], true);
    if (path) {
      // e.g. 
      // parsed = { VITE_DEMO: 'DEMO' }
      const parsed = dotenv_1.default(fs_extra_1.default.readFileSync(path), {
        debug: !!process.env.DEBUG || undefined
      });
      // 让环境变量相互使用
      dotenv_expand_1.default({
        parsed,
        // 防止process.env突变
        ignoreProcessEnv: true
      });
      for (const [key, value] of Object.entries(parsed)) {
        // 只有以prefix开头的键才会公开。
        if (key.startsWith(prefix) && env[key] === undefined) {
          env[key] = value;
        }
      }
    }
  }
  debug(`env: %0`, env);
  return env;
}

exports.loadEnv = this.loadEnv;
exports.defaultDefines = {
  __VUE_OPTIONS_API__: true,
  __VUE_PROD_DEVTOOLS__: false
}