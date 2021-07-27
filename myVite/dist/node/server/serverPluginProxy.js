"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyPlugin = void 0;
const url_1 = require("url");
const proxyPlugin = ({ app, config, server }) => {
  if (!config.proxy) {
    return;
  }
  const debug = require('debug')('vite:proxy');
  const proxy = require('koa-proxies');
  const options = config.proxy;
  Object.keys(options).forEach((path) => {
    // TODO
  });
  server.on('upgrade', (req, socket, head) => {
    // TODO
  });
};
exports.proxyPlugin = proxyPlugin;