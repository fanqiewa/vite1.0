"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esbuildPlugin = void 0;
const esbuildService_1 = require("../esbuildService");
const utils_1 = require("../utils");
const esbuildPlugin = ({ app, config, resolver }) => {
  const jsxConfig = esbuildService_1.resolveJsxOptions(config.jsx);
  app.use(async (ctx, next) => {
    // TODO
  });
}
exports.esbuildPlugin = esbuildPlugin;