"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildCssPlugin = void 0;
const path_1 = __importDefault(require("path"));
const buildPluginAsset_1 = require("./buildPluginAsset");
const cssUtils_1 = require("../utils/cssUtils");
const chalk_1 = __importDefault(require("chalk"));
const pluginutils_1 = require("@rollup/pluginutils");
const slash_1 = __importDefault(require("slash"));
const debug = require('debug')('vite:build:css');
const cssInjectionMarker = `__VITE_CSS__`;
const cssInjectionRE = /__VITE_CSS__\(\);?/g;

const createBuildCssPlugin = ({ root, publicBase, assetsDir, minify = false, inlineLimit = 0, cssCodeSplit = true, preprocessOptions, modulesOptions = {} }) => {
  const styles = new Map();
  let staticCss = '';
  const emptyChunks = new Set();
  return {
    name: 'vite:css',
    async transform(css, id) {
      // TODO
    },
    async renderChunk(code, chunk) {
      // TODO
    },
    async generateBundle(_options, bundle) {
      // TODO
    }
  };
};

exports.createBuildCssPlugin = createBuildCssPlugin;