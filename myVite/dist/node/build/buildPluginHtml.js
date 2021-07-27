"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildHtmlPlugin = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const magic_string_1 = __importDefault(require("magic-string"));
const utils_1 = require("../utils");
const createBuildHtmlPlugin = async (root, indexPath, publicBasePath, assetsDir, inlineLimit, resolver, shouldPreload, config) => {
  // 如果没有模板html（index.html)
  if (!fs_extra_1.default.existsSync(indexPath)) {
    return {
      renderIndex: () => '',
      htmlPlugin: null
    }
  }
  // 原始的html
  const rawHtml = await fs_extra_1.default.readFile(indexPath, 'utf-8');
  // 处理后的html
  const preprocessedHtml = await utils_1.transformIndexHtml(rawHtml, config.indexHtmlTransforms, 'pre', true);
  const assets = new Map();
  let { html: processedHtml, js } = await compileHtml(root, preprocessedHtml, publicBasePath, assetsDir, inlineLimit, resolver, assets);
  const htmlPlugin = {
    name: 'vite:html',
    async load(id) {
      if (id === indexPath) {
        return js;
      }
    },
    generateBundle(_options, bundle) {
      buildPluginAsset_1.registerAssets(assets, bundle);
    }
  }
  // 注入css
  const injectCSS = (html, filename) => {
		const tag = `<link rel="stylesheet" href="${publicBasePath}${path_1.default.posix.join(assetsDir, filename)}">`;
		if (/<\/head>/.test(html)) {
			return html.replace(/(^\s*)?<\/head>/m, `$1$1${tag}\n$&`);
		}
		else {
			return tag + '\n' + html;
		}
  }
  // 注入script标签
  const injectScript = (html, filename) => {
    filename = utils_1.isExternalUrl(filename)
      ? filename
      : `${publicBasePath}${path_1.default.posix.join(assetsDir, filename)}`;
    const tag = `<script type="module" src="${filename}"></script>`;
    if (/<\/head>/.test(html)) {
      return html.replace(/(^\s*)?<\/head>/m, `$1$1${tag}\n$&`);
    }
    else {
      return html + '\n' + tag;
    }
  }
  const injectPreload = (html, filename) => {
    // TODO
  }
  const renderIndex = async (bundleOutput) => {
    let result = processedHtml;
    for (const chunk of bundleOutput) {
      if (chunk.type === 'chunk') {
        if (chunk.isEntry) {
          result = injectScript(result, chunk.fileName);
        }
        else if (shouldPreload && shouldPreload(chunk)) {
          result = injectPreload(result, chunk.fileName);
        }
      } else {
        if (chunk.fileName.endsWith('.css') &&
          chunk.source &&
          !assets.has(chunk.fileName)) {
          result = injectCSS(result, chunk.fileName);
        }
      }
    }
		return await utils_1.transformIndexHtml(result, config.indexHtmlTransforms, 'post', true);
  }

  return {
    renderIndex,
    htmlPlugin
  }
}
exports.createBuildHtmlPlugin = createBuildHtmlPlugin;
const assetAttrsConfig = {
  link: ['href'],
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href']
}
// 编译html
const compileHtml = async (root, html, publicBasePath, assetsDir, inlineLimit, resolver, assets) => {
  // @vue/compiler-dom -- vue3源码
  const { parse, transform } = require('@vue/compiler-dom');
  // @vue/compiler-core 不能转换小写的doctypes
  html = html.replace(/<!doctype\s>/i, '<!DOCTYPE ');
  const ast = parse(html);
  let js = '';
  const s = new magic_string_1.default(html);
  // 存储静态资源路径
  const assetUrls = [];
  const viteHtmlTransform = (node) => {
    if (node.type === 1 /* ELEMENT */) {
      if (node.tag === 'script') {
        let shouldRemove = false;
        const srcAttr = node.props.find((p) => p.type === 6 /* ATTRIBUTE */ && p.name === 'src');
        const typeAttr = node.props.find((p) => p.type === 6 /* ATTRIBUTE */ && p.name === 'type');
        const isJsModule = typeAttr && typeAttr.value && typeAttr.value.content === 'module';
        if (isJsModule) {
          if (srcAttr && srcAttr.value) {
            if (!utils_1.isExternalUrl(srcAttr.value.content)) {
              // <script type="module" src="..."/>
              // add it as an import
              js += `\nimport ${JSON.stringify(srcAttr.value.content)}`;
              shouldRemove = true;
            }
          } else if (node.children.length) {
            js += `\n` + node.children[0].content.trim() + `\n`;
            shouldRemove = true;
          }
        }
        if (shouldRemove) {
          s.remove(node.loc.start.offset, node.loc.end.offset);
        }
      }
      // 对于index.html中的静态资源引用，
      // 还要为每个引用生成导入语句-这将由静态资源插件处理
      const assetAttrs = assetAttrsConfig[node.tag];
      if (assetAttrs) {
        for (const p of node.props) {
          if (p.type === 6 /* ATTRIBUTE */ &&
            p.value &&
            assetAttrs.includes(p.name) &&
            !utils_1.isExternalUrl(p.value.content) &&
            !utils_1.isDataUrl(p.value.content)) {
            assetUrls.push(p);
          }
        }
      }
    }
  };
  transform(ast, {
    // 添加vite转换html拦截
    nodeTransforms: [viteHtmlTransform]
  });
  // 对于遇到的每个静态url，重写原始html，使其引用生成后的位置。
  for (const attr of assetUrls) {
    const value = attr.value;
    const { fileName, content, rul } = await buildPluginAsset_1.resolveAsset(resolver.requestToFile(value.content), root, publicBasePath, assetsDir, utils_1.cleanUrl(value.content).endsWith('.css') ? 0 : inlineLimit);
    s.overwrite(value.loc.start.offset, value.loc.end.offset, `"${url}"`);
    if (fileName && content) {
      assets.set(fileName, content);
    }
  }
  return {
    html: s.toString(),
    js
  }
}