"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBrowser = void 0;
const path_1 = __importDefault(require("path"));
const open_1 = __importDefault(require("open"));
const execa_1 = __importDefault(require("execa"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const OSX_CHROME = 'google chrome';
function getBrowserEnv() {
  const value = process.env.BROWSER;
  let action;
  if (!value) {
    // default
    action = 1 /* BROWSER */;
  } else if (value.toLowerCase().endsWith('.js')) {
    action = 2 /* SCRIPT */
  } else if (value.toLowerCase() === 'none') {
    action = 0 /* NODE */;
  } else {
    action = 1 /* BROWSER */;
  }
  return { action, value };
}

function startBrowserProcess(browser, url) {
  const shouldTryOpenChromeWithAppleScript = process.platform === 'darwin' &&
    (typeof browser !== 'string' || browser === OSX_CHROME);
  if (shouldTryOpenChromeWithAppleScript) {
    try {
      // TODO
    } catch (err) {

    }
  }

  if (process.platform === 'darwin' && browser === 'open') {
    browser = undefined;
  }

  try {
    var options = { app: browser, url: true };
    open_1.default(url, options).catch(() => { });
  } catch (err) {
    return false;
  }
}

// 打开浏览器
function openBrowser(url) {
  const { action, value } = getBrowserEnv();
  switch (action) {
    case 0 /* NODE */:
      return false;
    case 2 /* SCRIPT */:
      return executeNodeScript(value, url);
    case 1 /* BROWSER */:
      return startBrowserProcess(value, url);
    default:
      throw new Error('Not implemented.');
  }
}
exports.openBrowser = openBrowser;