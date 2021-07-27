"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReplacePlugin = void 0;
const magic_string_1 = __importDefault(require("magic-string"));
const createReplacePlugin = (test, replacements, sourcemap) => {
	const pattern = new RegExp('\\b(' +
  Object.keys(replacements)
    .map((str) => {
      return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    })
    .join('|') +
  ')\\b', 'g');
	return {
		name: 'vite:replace',
    transform(code, id) {
      // TODO
    }
  }
}
exports.createReplacePlugin = createReplacePlugin;