"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = exports.rewriteImports = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// web开发框架（服务端）
const koa_1 = __importDefault(require("koa"));
// 监听本地文件修改
const chokidar_1 = __importDefault(require("chokidar"));
const resolver_1 = require("../resolver");
const serverPluginModuleRewrite_1 = require("./serverPluginModuleRewrite");
const serverPluginModuleResolve_1 = require("./serverPluginModuleResolve");
const serverPluginVue_1 = require("./serverPluginVue");
const serverPluginHmr_1 = require("./serverPluginHmr");
const serverPluginServeStatic_1 = require("./serverPluginServeStatic");
const serverPluginJson_1 = require("./serverPluginJson");
const serverPluginCss_1 = require("./serverPluginCss");
const serverPluginAssets_1 = require("./serverPluginAssets");
const serverPluginEsbuild_1 = require("./serverPluginEsbuild");
const transform_1 = require("../transform");
const serverPluginHtml_1 = require("./serverPluginHtml");
const serverPluginProxy_1 = require("./serverPluginProxy");
const createCertificate_1 = require("../utils/createCertificate");
const utils_1 = require("../utils");
const serverPluginEnv_1 = require("./serverPluginEnv");
var serverPluginModuleRewrite_2 = require("./serverPluginModuleRewrite");
Object.defineProperty(exports, "rewriteImports", { enumerable: true, get: function () { return serverPluginModuleRewrite_2.rewriteImports; } });
const serverPluginSourceMap_1 = require("./serverPluginSourceMap");
const serverPluginWebWorker_1 = require("./serverPluginWebWorker");
const serverPluginWasm_1 = require("./serverPluginWasm");
const serverPluginClient_1 = require("./serverPluginClient");
/**
 * 创建服务
 * @param {Object} config config配置信息
 */
function createServer(config) {
  const { root = process.cwd(), configureServer = [], resolvers = [], alias = {}, transforms = [], vueCustomBlockTransforms = {}, optimizeDeps = {}, enableEsbuild = true, assetsInclude } = config;
  const app = new koa_1.default();
  // app.callback()返回适用于 http.createServer() 方法的回调函数来处理请求
  const server = resolveServer(config, app.callback());
  // 监听文件修改
  const watcher = chokidar_1.default.watch(root, {
    ignored: ['**/node_modules/**', '**/.git/**'],
    awaitWriteFinish: {
      // 表示文件操作节流的时间，如果你文件操作比较频繁，每次都触发事件会影响性能，通过节流方式只有在此时间内不存在操作才能触发事件
      stabilityThreshold: 100,
      // 文件大小轮询间隔，它们都是以毫秒为单位。
      pollInerval: 10
    }
  });
  const resolver = resolver_1.createResolver(root, resolvers, alias, assetsInclude);
  const context = {
    root,
    app,
    server,
    watcher,
    resolver,
    port: config.port || 3000
  }
  // 对于任何请求，app将调用该异步函数处理请求：
  // 参数ctx是由koa传入的封装了request和response的变量，我们可以通过它访问request和response，next是koa传入的将要处理的下一个异步函数。
  app.use((ctx, next) => {
    Object.assign(ctx, context);
    ctx.read = utils_1.cachedRead.bind(null, ctx);
    return next();
  });
  // cors
  if (config.cors) {
    app.use(require('@koa/cors')(typeof config.cors === 'boolean' ? {} : config.cors));
  }
  const resolvedPlugins = [
    serverPluginSourceMap_1.sourceMapPlugin,
    serverPluginModuleRewrite_1.moduleRewritePlugin,
    serverPluginHtml_1.htmlRewritePlugin,
    // user plugins
    ...utils_1.toArray(configureServer),
    serverPluginEnv_1.envPlugin,
    serverPluginModuleResolve_1.moduleResolvePlugin,
    serverPluginProxy_1.proxyPlugin,
    serverPluginClient_1.clientPlugin,
    serverPluginHmr_1.hmrPlugin,
    ...(transforms.length || Object.keys(vueCustomBlockTransforms).length
      ? [
        transform_1.createServerTransformPlugin(transforms, vueCustomBlockTransforms, resolver)
      ]
      : []),
    serverPluginVue_1.vuePlugin,
    serverPluginCss_1.cssPlugin,
    enableEsbuild ? serverPluginEsbuild_1.esbuildPlugin : null,
    serverPluginJson_1.jsonPlugin,
    serverPluginAssets_1.assetPathPlugin,
    serverPluginWebWorker_1.webWorkerPlugin,
    serverPluginWasm_1.wasmPlugin,
    serverPluginServeStatic_1.serveStaticPlugin
  ];
  // 注入plugin
  resolvedPlugins.forEach((m) => m && m(context));
  const listen = server.listen.bind(server);
  // 重新定义server.listen
  server.listen = (async (port, ...args) => {
    if (optimizeDeps.auto !== false) {
      await require('../optimizer').optimizeDeps(config);
    } 
    return listen(port, ...args);
  });
  server.once('listening', () => {
    context.port = server.address().port;
  });
  return server;
}
exports.createServer = createServer;
/**
 * 解析服务
 * Server-API:
 *  - server.https
 *  - server.proxy
 */
function resolveServer({ https = false, httpsOptions = {}, proxy }, requestListener) {
  if (!https) {
    return require('http').createServer(requestListener);
  }
  if (proxy) {
    // 创建代理
    return require('https').createServer(resolveHttpsConfig(httpsOptions), requestListener);
  } else {
    return require('http2').createSecureServer({
        ...resolveHttpsConfig(httpsOptions),
        allowHTTP1: true
    }, requestListener);
  }
}

// 解析https配置
function resolveHttpsConfig(httpsOption) {
  const { ca, cert, key, pfx } = httpsOption;
  Object.assign(httpsOption, {
    ca: readFileIfExists(ca),
    cert: readFileIfExists(cert), // 证书
    key: readFileIfExists(key),
    pfx: readFileIfExists(pfx) // 
  });
  if (!httpsOption.key || !httpsOption.cert) {
    httpsOption.cert = httpsOption.key = createCertificate_1.createCertificate();
  }
  return httpsOption;
}

// 读取文件，如果存在
function readFileIfExists(value) {
  if (value && !Buffer.isBuffer(value)) {
    try {
      return fs_extra_1.default.readFileSync(path_1.default.resolve(value));
    }
    catch (e) {
      return value;
    }
  }
  return value;
}