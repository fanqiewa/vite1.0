"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 开始
const start = Date.now();
// 解析命令行参数
const argv = require('minimist')(process.argv.slice(2));
// 确保在需要任何操作之前设置调试标志
if (argv.debug) {
  process.env.DEBUG = `vite:` + (argv.debug === true ? '*' : argv.debug);
  try {
    // 这仅在本地开发期间存在
    require('source-map-support').install();
  } catch (e) {}
}

// 解析命令行参数
const cac_1 = require("cac");
// node模块 块提供了与操作系统相关的实用方法和属性
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
// 修改控制台中字符串的样式
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
// 指定名称
const cli = cac_1.cac(`vite`);
// 全局options
cli
  .option('--config <file>, -c <file>', `[string]  use specified config file`)
  .option('--debug [feat]', `[string | boolean]  show debug logs`)
  .option('--mode <mode>, -m <mode>', `[string]  specify env mode (default: 'development' for dev, 'production' for build)`)
  .option('--jsx <preset>', `['vue' | 'preact' | 'react']  choose jsx preset (default: 'vue')`)
  .option('--jsx-factory <string>', `[string]  (default: React.creatElement)`)
  .option('--jsx-fragment <string>', `[string]  (default: React.Fragment)`);

// 服务配置 serve
cli
  .command('[root]') // 默认名 e.g. npm run dev   package.json -> script -> dev: 'vite dev'
  .alias('serve') // 别名为serve e.g. npm run serve
  .option('--port <port>', `[number] port to listen to`)
  .option('--force', `[boolean]  force the optimizer to ignore the cache and re-bundle`)
  .option('--https', `[boolean]  start the server with TLS and HTTP/2 enabled`)
  .option('--open', `[boolean]  open browser on server start`)
  .action(async (root, argv) => {
    if (root) {
      argv.root = root;
    }
    const options = await resolveOptions({ arg, defaultMode: 'development' /* serve 时默认 'development' */});
    return runServe(options);
  });

// 打包配置 build
cli
  .command('build [root]')
  .option('--entry <file>', `[string]  entry file for build (default: index.html)`)
  .option('--base <path>', `[string]  public base path (default: /)`)
  .option('--outDir <dir>', `[string]  output directory (default: dist)`)
  .option('--assetsDir <dir>', `[string]  directory under outDir to place assets in (default: _assets)`)
  .option('--assetsInlineLimit <number>', `[number]  static asset base64 inline threshold in bytes (default: 4096)`)
  .option('--ssr', `[boolean]  build for server-side rendering`)
  .option('--sourcemap', `[boolean]  output source maps for build (default: false)`)
  .option('--minify [minifier]', `[boolean | 'terser' | 'esbuild']  enable/disable minification, or specify minifier to use (default: terser)`)
  .action(async (root, argv) => {
    if (root) {
        argv.root = root;
    }
    const options = await resolveOptions({ argv, defaultMode: 'production' /* serve 时默认 'production' */});
    return runBuild(options);
  });

// 最优化 optimize
cli
  .command('optimize [root]')
  .option('--force', `[boolean]  force the optimizer to ignore the cache and re-bundle`)
  .action(async (root, argv) => {
    if (root) {
      argv.root = root;
    }
    const options = await resolveOptions({ argv, defaultMode: 'development' });
    return runOptimize(options);
  });
  cli.help();
  cli.version(require('../../package.json').version);
  cli.parse();

// 异步解析options
async function resolveOptions({ argv, defaultMode }) {
  // 将字符串转成boolean类型
  Object.keys(argv).forEach((key) => {
    if (argv[key] === 'false') {
      argv[key] = false;
    }
    if (argv[key] === 'true') {
      argv[key] = true;
    }
  });
  // 定义项目根路径
  // e.g. npm run dev vite-demo
  if (argv.root) {
    argv.root = path_1.default.isAbsolute(argv.root) ? argv.root : path_1.default.resolve(argv.root);
  }
  // [vite]由于性能提升不足，服务工作者模式已被删除。
  if (argv.sw || argv.serviceWorker) {
    console.warn(chalk_1.default.yellow(`[vite] service worker mode has been removed due to insufficient performance gains.`));
  }
  // ESbuild 转换
  if (argv.jsxFactory || argv.jsxFragment) {
    argv.jsx = { factory: argv.jsxFactory, fragment: argv.jsxFragment };
  }

  // 解析vite.config.js
  // 可以显式地通过 --config 命令行选项指定一个配置文件
  const userConfig = await config_1.resolveConfig(argv.mode || defaultMode, argv.config || argv.c);
  
  // 当在.ENV文件或vite.config.js文件中的`ENV`选项中设置NODE_ENV时，
  // 它将覆盖客户机包中的`import.meta.ENV`的`DEV`和`PROD`值，
  // 甚至`process.ENV.NODE_ENV`值，否则将使用`argv.mode`。
  if (userConfig.env.NODE_ENV) {
    process.env.VITE_ENV = userConfig.env.NODE_ENV;
    delete userConfig.env.NODE_ENV;
  }
  return { ...userConfig, ...argv };
}
// 打包
async function runBuild(options) {
  try {
    await require('./build')[options.ssr ? 'srrBuild' : 'build'](options);
    // 退出命令
    process.exit(0);
  } catch (err) {
    console.error(chalk_1.default.red(`[vite] Build errored out.`));
    console.error(err);
    process.exit(1);
  }
}
// 本地运行
function runServe(options) {
  // 创建一个本地服务
  const server = require('./server').createServer(options);
  // 端口号，默认3000
  let port = options.port || 3000;
  // 域名，默认localhost
  let hostname = options.hostname || 'localhost';
  // 协议，默认http
  const protocol = options.https ? 'https' : 'http';
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying another one...`);
      setTimeout(() => {
        server.close();
        server.listen(++port);
      }, 100);
    } else {
      console.error(chalk_1.default.red(`[vite] server error:`));
      console.error(e);
    }
  });
  server.listen(port, () => {
    console.log();
    console.log(` Dev server running at:`);
    // 返回一个对象，该对象包含已分配了网络地址的网络接口。
    const interfaces = os_1.default.networkInterfaces();
    Object.keys(interfaces).forEach((key) => (interfaces[key] || [])
      .filter((details) => details.family === 'IPv4')
      .map((detail) => {
        return {
          type: detail.address.includes('127.0.0.1')
            ? 'Local:   '
            : 'Network: ',
          host: detail.address.replace('127.0.0.1', hostname)
        };
    })
    .forEach(({ type, host }) => {
      const url = `${protocol}://${host}:${chalk_1.default.bold(port)}/`;
      console.log(` > ${type} ${chalk_1.default.cyan(url)}`);
    }));
    console.log();
    require('debug') ('vite:server')(`server ready in ${Date.now() - start}ms.`);
    
  /**
   * 在服务器启动时自动在浏览器中打开应用程序。
   * Server-API:
   *  - server.open
   */
    if (options.open) {
      require('./utils/openBrowser').openBrowser(`${protocol}://${hostname}:${port}`);
    }
  })
}