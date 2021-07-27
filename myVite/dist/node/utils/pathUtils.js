"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slash_1 = __importDefault(require("slash"));
const querystring_1 = __importDefault(require("querystring"));
const resolve_1 = __importDefault(require("resolve"));
const resolver_1 = require("../resolver");
let isRunningWithYarnPnp;
try {
  isRunningWithYarnPnp = Boolean(require('pnpapi'));
}
catch { }
const resolveFrom = (root, id) => resolve_1.default.sync(id, {
  basedir: root,
  extensions: resolver_1.supportedExts,
  preserveSymlinks: isRunningWithYarnPnp || false
});
exports.resolveFrom = resolveFrom;
exports.queryRE = /\?.*$/;
exports.hashRE = /#.*$/;
const cleanUrl = (url) => url.replace(exports.hashRE, '').replace(exports.queryRE, '');
exports.cleanUrl = cleanUrl;
const parseWithQuery = (id) => {
  const queryMatch = id.match(exports.queryRE);
  if (queryMatch) {
    return {
      path: slash_1.default(exports.cleanUrl(id)),
      query: querystring_1.default.parse(queryMatch[0].slice(1))
    }
  }
  return {
    path: id,
    query: {}
  };
};
exports.parseWithQuery = parseWithQuery;
exports.bareImportRE = /^[^\/\.]/;
// 判断是否为外部引用
const externalRE = /^(https?:)?\/\//;
const isExternalUrl = (url) => externalRE.test(url);
exports.isExternalUrl = isExternalUrl;
// 判断是否为data引用
const dataUrlRE = /^\s*data:/i;
const isDataUrl = (url) => dataUrlRE.test(url);
exports.isDataUrl = isDataUrl;
const imageRE = /\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/;
const mediaRE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/;
const fontsRE = /\.(woff2?|eot|ttf|otf)(\?.*)?$/i;
// 检查文件是否为静态资源
const isStaticAsset = (file) => {
  return imageRE.test(file) || mediaRE.test(file) || fontsRE.test(file);
}
exports.isStaticAsset = isStaticAsset;
const isImportRequest = (ctx) => {
  return ctx.query.import != null;
}
exports.isImportRequest = isImportRequest;
// 移除无关的hrm请求参数
function removeUnRelatedHmrQuery(url) {
  const { path, query } = exports.parseWithQuery(url);
  delete query.t;
  delete query.import;
  if (Object.keys(query).length) {
    return path + '?' + querystring_1.default.stringify(query);
  }
  return path;
}
exports.removeUnRelatedHmrQuery = removeUnRelatedHmrQuery;