"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordCssImportChain = exports.getCssImportBoundaries = exports.cssImporteeMap = exports.cssImporterMap = exports.resolvePostcssOptions = exports.compileCss = exports.rewriteCssUrls = exports.isCSSRequest = exports.cssModuleRE = exports.cssPreprocessLangRE = exports.urlRE = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const transformUtils_1 = require("./transformUtils");
const pathUtils_1 = require("./pathUtils");
const resolveVue_1 = require("./resolveVue");
const hash_sum_1 = __importDefault(require("hash-sum"));

exports.cssPreprocessLangRE = /\.(less|sass|scss|styl|stylus|postcss)$/;
const isCSSRequest = (file) => file.endsWith('.css') || exports.cssPreprocessLangRE.test(file);
exports.isCSSRequest = isCSSRequest;

async function compileCss(root, publicPath, { source, filename, scoped, modules, vars, preprocessLang, preprocessOptions = {}, modulesOptions = {} }, isBuild = false) {
	const id = hash_sum_1.default(publicPath);
	const postcssConfig = await loadPostcssConfig(root);
	const { compileStyleAsync } = resolveVue_1.resolveCompiler(root);
	// TODO

}
exports.compileCss = compileCss;
let cachedPostcssConfig;
async function loadPostcssConfig(root) {
	if (cachedPostcssConfig !== undefined) {
		return cachedPostcssConfig;
	}
	try {
		const load = require('postcss-load-config');
		return (cachedPostcssConfig = await load({}, root));
	} catch (e) {
		if (!/No PostCSS Config found/.test(e.message)) {
			console.error(chalk_1.default.red(`[vite] Error loading postcss config:`));
			console.error(e);
		}
		return (cachedPostcssConfig = null);
	}
}
