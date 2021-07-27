"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vuePlugin = exports.vueCache = exports.srcImportMap = void 0;
const querystring_1 = __importDefault(require("querystring"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const compiler_sfc_1 = require("@vue/compiler-sfc");
const resolveVue_1 = require("../utils/resolveVue");
const hash_sum_1 = __importDefault(require("hash-sum"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const serverPluginHmr_1 = require("./serverPluginHmr");
const utils_1 = require("../utils");
const esbuildService_1 = require("../esbuildService");
const resolver_1 = require("../resolver");
const serverPluginServeStatic_1 = require("./serverPluginServeStatic");
const serverPluginCss_1 = require("./serverPluginCss");
const cssUtils_1 = require("../utils/cssUtils");
const serverPluginModuleRewrite_1 = require("./serverPluginModuleRewrite");
const serverPluginSourceMap_1 = require("./serverPluginSourceMap");
const debug = require('debug')('vite:sfc');
const getEtag = require('etag');
exports.srcImportMap = new Map();
exports.vueCache = new lru_cache_1.default({
    max: 65535
});
const vuePlugin = ({ root, app, resolver, watcher, config }) => {
  const etagCacheCheck = (ctx) => {
    ctx.etag = getEtag(ctx.body);
    ctx.status = 
      serverPluginServeStatic_1.seenUrls.has(ctx.url) && ctx.etag === ctx.get('If-None-Match') ? 304 : 200;
    serverPluginServeStatic_1.seenUrls.add(ctx.url);
  };
  app.use(async (ctx, next) => {
    if (!ctx.path.endsWith('.vue') && !ctx.vue) {
      return next();
    }
    const query = ctx.query;
    const publicPath = ctx.path;
    let filePath = resolver.requestToFile(publicPath);

    const descriptor = await parseSFC(root, filePath, ctx.body);
    if (!descriptor) {
      return next();
    }
    if (!query.type) {
      // 因为我们在这里进行自定义读取，所以请注意根vue文件
      utils_1.watchFileIfOutOfRoot(watcher, root, filePath);
      if (descriptor.script && descriptor.script.src) {
        // TODO
      }
      ctx.type = 'js';
      const { code, map } = await compileSFCMain(descriptor, filePath, publicPath, root);
      ctx.body = code;
      ctx.map = map;
      return etagCacheCheck(ctx);
    }
  });
  const handleVueReload = (watcher.handleVueReload = async (filePath, timestamp = Date.now(), content) => {
    // TODO
  });
  watcher.on('change', (file) => {
    // TODO
  })
}
exports.vuePlugin = vuePlugin;

async function parseSFC(root, filePath, content) {
  let cached = exports.vueCache.get(filePath);
  if (cached && cached.descriptor) {
    debug(`${filePath} parse cache hit`);
    return cached.descriptor;
  }
  if (!content) {
    try {
      content = await utils_1.cachedRead(null, filePath);
    } catch (e) {
      return;
    }
  }
  if (typeof content !== 'string') {
    content = content.toString();
  }
  const start = Date.now();
  // Vue3 - parse
  const { parse } = resolveVue_1.resolveCompiler(root);
  const { descriptor, errors } = parse(content, {
    filename: filePath,
    sourceMap: true
  });
  if (errors.length) {
    console.error(chalk_1.default.red(`\n[vite] SFC parse error: `));
    console.forEach((e) => {
      logError(e, filePath, content);
    });
  }
  cached = cached || { styles: [], customs: [] };
  cached.descriptor = descriptor;
  exports.vueCache.set(filePath, cached);
  debug(`${filePath} parsed in ${Date.now() - start}ms.`);
  return descriptor;
}
async function compileSFCMain(descriptor, filePath, publicPath, root) {
  let cached = exports.vueCache.get(filePath);
  if (cached && cached.script) {
    return cached.script;
  }
  const id = hash_sum_1.default(publicPath);
  let code = ``;
  let content = ``;
  let map;
  let script = descriptor.script;
  const compiler = resolveVue_1.resolveCompiler(root);
  if ((descriptor.script || descriptor.scriptSetup) && compiler.compileScript) {
    try {
      // 编译.vue文件里面的<script></script>内容
      script = compiler.compileScript(descriptor, {
        id
      });
    } catch (e) {
      console.error(chalk_1.default.red(`\n[vite] SFC <script setup> compilation error:\n${chalk_1.default.dim(chalk_1.default.white(filePath))}`));
      console.error(chalk_1.default.yellow(e.message));
    }
  }
  if (script) {
    content = script.content;
    map = script.map;
    if (script.lang === 'ts') {
      const res = await esbuildService_1.transform(content, publicPath, {
        loader: 'ts'
      });
      content = res.code;
      map = serverPluginSourceMap_1.mergeSourceMap(map, JSON.parse(res.map));
    }
  }
  code += compiler_sfc_1.rewriteDefault(content, '__script');
  let hasScoped = false;
  let hasCSSModules = false;
  if (descriptor.styles) {
    descriptor.styles.forEach((s, i) => {
      // TODO
    });
    if (hasScoped) {
      code += `\n__script.__scopeId = "data-v-${id}"`;
    }
  }
  if (descriptor.customBlocks) {
    descriptor.customBlocks.forEach((c, i) => {
      // TODO
    })
  }
  if (descriptor.template) {
    const templateRequest = publicPath + `?type=template`;
    code += `\nimport { render as __render } from ${JSON.stringify(templateRequest)}`;
    code += `\n__script.render = __render`;
  }
  code += `\n__script.__hmrId = ${JSON.stringify(publicPath)}`;
  code += `\ntypeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(__script.__hmrId, __script)`;
  code += `\n__script.__file = ${JSON.stringify(filePath)}`;
  code += `\nexport default __script`;
  const result = {
    code,
    map,
    bindings: script ? script.bindings : undefined
  };
  cached = cached || { styles: [], customs: [] };
  cached.script = result;
  exports.vueCache.set(filePath, cached);
  return result;
}

function logError(e, file, src) {
  const locString = e.loc ? `:${e.loc.start.line}:${e.loc.start.column}` : ``;
  console.error(chalk_1.default.underline(file + locString));
  console.error(chalk_1.default.yellow(e.message));
  if (e.loc) {
    console.error(compiler_sfc_1.generateCodeFrame(src, e.loc.start.offset, e.loc.end.offset) + `\n`);
  }
}