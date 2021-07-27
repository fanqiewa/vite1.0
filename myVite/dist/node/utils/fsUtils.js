"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchFileIfOutOfRoot = exports.lookupFile = exports.readBody = exports.cachedRead = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const stream_1 = require("stream");
const serverPluginServeStatic_1 = require("../server/serverPluginServeStatic");
const mime_types_1 = __importDefault(require("mime-types"));
const getETag = require('etag');
const fsReadCache = new lru_cache_1.default({
    max: 10000
});
async function cachedRead(ctx, file) {
  const lastModified = fs_extra_1.default.statSync(file).mtimeMs;
  const cached = fsReadCache.get(file);
  if (ctx) {
    ctx.set('Cache-Control', 'no-cache');
    ctx.type = mime_types_1.default.lookup(path_1.default.extname(file)) || 'application/octet-stream';
  }

  if (cached && cached.lastModified === lastModified) {
    // TODO
  }

  let content = await fs_extra_1.default.readFile(file);

  if (file.endsWith('.map')) {
    // TODO
  }
  const etag = getETag(content);
  fsReadCache.set(file, {
    content,
    etag,
    lastModified
  });
  if (ctx) {
    ctx.etag = etag;
    ctx.lastModified = new Date(lastModified);
    ctx.status = 200;
    const { root, watcher } = ctx;
    watchFileIfOutOfRoot(watcher, root, file);
  }
  return content;
}
exports.cachedRead = cachedRead;
/**
 * 读取Koa上下文上的ready set body并将其规范化为字符串。
 * 用于后处理中间件。
 */
async function readBody(stream) {
  if (stream instanceof stream_1.Readable) {
    return new Promise((resolve, reject) => {
      let res = '';
      stream
        .on('data', (chunk) => (res += chunk))
        .on('error', reject)
        .on('end', () => {
          resolve(res);
        });
    })
  } else {
    return !stream || typeof stream === 'string' ? stream : stream.toString();
  }
}
exports.readBody = readBody;
/**
 * 查找文件
 * @param {String} dir 文件路径
 * @param {Array} formats 格式化 e.g. ['.env.development.local']
 * @param {Boolean} pathOnly 是否只读取文件路径，而不是取文件中的内容
 */
function lookupFile(dir, formats, pathOnly = false) {
  for (const format of formats) {
    // 构建文件路径
    const fullPath = path_1.default.join(dir, format);
    // statSync 同步获取文件信息
    if (fs_extra_1.default.existsSync(fullPath) && fs_extra_1.default.statSync(fullPath).isFile()) {
      return pathOnly ? fullPath : fs_extra_1.default.readFileSync(fullPath, 'utf-8');
    }
  }
  // 如果当前目录没有读取到dir文件，则递归父级目录
  const parentDir = path_1.default.dirname(dir);
  if(parentDir !== dir) {
    return lookupFile(parentDir, formats, pathOnly);
  }
}
exports.lookupFile = lookupFile;

function watchFileIfOutOfRoot(watcher, root, file) {
  if (!file.startsWith(root) && !/node_modules/.test(file)) {
    watcher.add(file);
  }
}
exports.watchFileIfOutOfRoot = watchFileIfOutOfRoot;