"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envPlugin = exports.envPublicPath = void 0;
exports.envPublicPath = '/vite/env';
const envPlugin = ({ app, config }) => {
  // configMode
  const configMode = config.mode || 'development';
  const resolvedMode = process.env.VITE_ENV || configMode;
  const env = JSON.stringify({
    ...config.env,
    BASE_URL: '/',
    MODE: configMode,
    DEV: resolvedMode !== 'production',
    PROD: resolvedMode === 'production'
  });
  app.use((ctx, next) => {
    // 返回配置文件
    // e.g. 
    // 访问：http://localhost:3000/vite/env
    // 页面渲染：'export default {"VITE_DEMO":"DEMO","BASE_URL":"/","MODE":"development","DEV":true,"PROD":false}'
    if (ctx.path === exports.envPublicPath) {
      ctx.type = 'js';
      ctx.body = `export default ${env}`;
      return;
    }
    return next();
  })
};
exports.envPlugin = envPlugin;