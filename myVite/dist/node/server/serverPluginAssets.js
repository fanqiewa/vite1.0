"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetPathPlugin = void 0;
const utils_1 = require("../utils");
const assetPathPlugin = ({ app, resolver }) => {
  app.use(async (ctx, next) => {
    if (resolver.isAssetRequest(ctx.path) && utils_1.isImportRequest(ctx)) {
      ctx.type = 'js';
      ctx.body = `export default ${JSON.stringify(ctx.path)}`;
      return;
    }
    return next();
  });
}
exports.assetPathPlugin = assetPathPlugin;