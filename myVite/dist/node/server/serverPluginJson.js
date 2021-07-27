"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonPlugin = void 0;
const utils_1 = require("../utils");
const pluginutils_1 = require("@rollup/pluginutils");
const jsonPlugin = ({ app }) => {
  app.use(async (ctx, next) => {
    await next();

    if (ctx.path.endWith('.json') && utils_1.isImportRequest(ctx) && ctx.body) {
      ctx.type = 'js';
      ctx.body = pluginutils_1.dataToEsm(JSON.parse((await utils_1.readBody(ctx.body))), {
        namedExports: true,
        preferConst: true
      });
    }
  })
};
exports.jsonPlugin = jsonPlugin;