"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });

const JsxPresets = {
  vue: { jsxFactory: 'jsx', jsxFragment: 'Fragment' },
  preact: { jsxFactory: 'h', jsxFragment: 'Fragment' },
  react: {} // use esbuild default
};
function resolveJsxOptions(options = 'vue') {
  if (typeof options === 'string') {
    if (!(options in JsxPresets)) {
      console.error(`[vite] unknown jsx preset: '${options}'.`);
    }
    return JsxPresets[options] || {};
  } else if (options) {
    return {
      jsxFactory: options.factory,
      jsxFragment: options.fragment
    }
  }
}
exports.resolveJsxOptions = resolveJsxOptions;