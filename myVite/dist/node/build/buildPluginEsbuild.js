"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEsbuildRenderChunkPlugin = exports.createEsbuildPlugin = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const esbuildService_1 = require("../esbuildService");
const createEsbuildPlugin = async (jsx = 'vue') => {
  const jsxConfig = esbuildService_1.resolveJsxOptions(jsx);
  return {
    name: 'vite:esbuild',
    // TODO
  }
}
exports.createEsbuildPlugin = createEsbuildPlugin;
const createEsbuildRenderChunkPlugin = (target, minify) => {
  return {
    name: 'vite:esbuild-transpile',
    async renderChunk(code, chunk) {
      // TODO
    }
  };
};
exports.createEsbuildRenderChunkPlugin = createEsbuildRenderChunkPlugin;
