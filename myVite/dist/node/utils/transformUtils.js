"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformIndexHtml = exports.injectScriptToHtml = exports.asyncReplace = void 0;

const injectReplaceRE = [/<head>/, /<!doctype html>/i];
function injectScriptToHtml(html, script) {
  for (const re of injectReplaceRE) {
    if (re.test(html)) {
      return html.replace(re, `$&${script}`);
    }
  }
  return script + html;
}
exports.injectScriptToHtml = injectScriptToHtml;
// 转换html plugin
async function transformIndexHtml(html, transforms = [], apply, isBuild = false) {
  const trans = transforms
    .map((t) => {
      return typeof t === 'function' && apply === 'post'
        ? t
        : t.apply === apply
          ? t.transform
          : undefined;
    })
    .filter(Boolean);
  let code = html;
  for (const transform of trans) {
    code = await transform({ isBuild, code });
  }
  return code;
}
exports.transformIndexHtml = transformIndexHtml;