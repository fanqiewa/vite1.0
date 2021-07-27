"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceMapPlugin = exports.mergeSourceMap = void 0;


const sourceMapPlugin = ({ app }) => {
  app.use(async (ctx, next) => {
    await next();
    if (typeof ctx.body === 'string' && ctx.map) {
      ctx.body += genSourceMapString(ctx.map);
    }
  });
};
exports.sourceMapPlugin = sourceMapPlugin;