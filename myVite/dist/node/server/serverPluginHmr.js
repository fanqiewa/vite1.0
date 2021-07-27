"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteFileWithHMR = exports.ensureMapEntry = exports.hmrPlugin = exports.latestVersionsMap = exports.hmrDirtyFilesMap = exports.importeeMap = exports.importerMap = exports.hmrDeclineSet = exports.hmrAcceptanceMap = exports.debugHmr = void 0;

exports.debugHmr = require('debug')('vite:hmr');

exports.importeeMap = new Map();
// WebSocket协议
const ws_1 = __importDefault(require("ws"));
const hmrPlugin = ({ root, app, server, watcher, resolver, config }) => {
  app.use((ctx, next) => {
    // TODO
  });
  const wss = new ws_1.default.Server({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    // TODO
  });
  wss.on('connection', (socket) => {
    // TODO
  });
  wss.on('error', (e) => {
    if (e.code !== 'EADDRINUSE') {
      console.error(chalk_1.default.red(`[vite] WebSocket server error:`));
      console.error(e);
    }
  });
  const send = (watcher.send = (payload) => {
    // TODO
  });
  const handleJSReload = (watcher.handleJSReload = (filePath, timestamp = Date.now()) => {
    // TODO
  });
  watcher.on('change', (file) => {
    // TODO
  });
};
exports.hmrPlugin = hmrPlugin;

function ensureMapEntry(map, key) {
  let entry = map.get(key);
  if (!entry) {
    entry = new Set();
    map.set(key, entry);
  }
  return entry;
}
exports.ensureMapEntry = ensureMapEntry;