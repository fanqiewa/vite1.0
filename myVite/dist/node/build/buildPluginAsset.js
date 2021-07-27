"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildAssetPlugin = exports.registerAssets = exports.resolveAsset = exports.injectAssetRe = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("../utils");
const slash_1 = __importDefault(require("slash"));
const mime_types_1 = __importDefault(require("mime-types"));
const debug = require('debug')('vite:build:asset');
const assetResolveCache = new Map();
const publicDirRE = /^public(\/|\\)/;
exports.injectAssetRe = /import.meta.ROLLUP_FILE_URL_(\w+)/;
const createBuildAssetPlugin = (root, resolver, publicBase, assetsDir, inlineLimit) => {
  const handleToIdMap = new Map();
  return {
    name: 'vite:asset',
    async load(id) {
      // TODO
    },
    async renderChunk(code) {
      // TODO
    }
  };
};
exports.createBuildAssetPlugin = createBuildAssetPlugin;