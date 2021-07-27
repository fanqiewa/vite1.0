"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCompiler = exports.resolveVue = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const pathUtils_1 = require("./pathUtils");
const chalk_1 = __importDefault(require("chalk"));
const fsUtils_1 = require("./fsUtils");
let resolved = undefined;
function resolveVue(root) {
  if (resolved) {
    return resolved;
  }
  let vueVersion;
  let vueBasePath;
  let compilerPath;
  // 读取package.json文件的内容
  const projectPkg = JSON.parse(fsUtils_1.lookupFile(root, ['package.json']) || `{}`);
  let isLocal = !!(projectPkg.dependencies && projectPkg.dependencies.vue);
  if (isLocal) {
    try {
      const userVuePkg = pathUtils_1.resolveFrom(root, 'vue/package.json');
      vueBasePath = path_1.default.dirname(userVuePkg);
      vueVersion = fs_extra_1.default.readJSONSync(userVuePkg).version;
      isLocal = true;
    } catch (e) {
      isLocal = false;
    }
    if (isLocal) {
      try {
        const compilerPkgPath = pathUtils_1.resolveFrom(root, '@vue/compiler-sfc/package.json');
        const compilerPkg = require(compilerPath);
        if (compilerPkg.version !== vueVersion) {
          throw new Error();
        }
        compilerPath = path_1.default.join(path_1.default.dirname(compilerPkgPath), compilerPath.main);
      } catch (e) {
        console.error(chalk_1.default.red(`[vite] Error: a local installation of \`vue\` is detected but ` +
          `no matching \`@vue/compiler-sfc\` is found. Make sure to instanll ` +
          `both and use the same version.`));
        compilerPath = require.resolve('@vue/compiler-sfc');
      }
    }
  } else {
    vueVersion = require('vue/package.json').version;
    vueBasePath = path_1.default.dirname(require.resolve('vue/package.json'));
    compilerPath = require.resolve('@vue/compiler-sfc');
  }
  const resolvePath = (name, from) => pathUtils_1.resolveFrom(from, `@vue/${name}/dist/${name}.esm-bundler.js`);

  /**
   * -vue
   *  "@vue/compiler-dom", "@vue/runtime-dom", "@vue/shared"
   * -vite
   *  "@vue/compiler-dom", "@vue/compiler-sfc"
   * -runtime-dom
   *  "@vue/runtime-core"
   * -runtime-core
   *  "@vue/reactivity", "@vue/shared"
   * -compiler-sfc
   *  "@vue/compiler-ssr", "@vue/compiler-core"
   */
  const runtimeDomPath = resolvePath('runtime-dom', vueBasePath);
  const runtimeCorePath = resolvePath('runtime-core', runtimeDomPath);
  const reactivityPath = resolvePath('reactivity', runtimeCorePath);
  const sharedPath = resolvePath('shared', runtimeCorePath);
  resolved = {
    version: vueVersion,
    vue: runtimeDomPath,
    '@vue/runtime-dom': runtimeDomPath,
    '@vue/runtime-core': runtimeCorePath,
    '@vue/reactivity': reactivityPath,
    '@vue/shared': sharedPath,
    compiler: compilerPath,
    isLocal
  };
  return resolved;
}
exports.resolveVue = resolveVue;
function resolveCompiler(cwd) {
  return require(resolveVue(cwd).compiler);
}
exports.resolveCompiler = resolveCompiler;