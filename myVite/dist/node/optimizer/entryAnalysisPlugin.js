"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entryAnalysisPlugin = void 0;
// 入口分析插件
function entryAnalysisPlugin() {
  const analysis = { isCommonjs: {} };
  return {
    name: "vite:cjs-entry-named-export",
    async generateBundle(options, bundles) {
      Object.values(bundles).forEach((bundle) => {
        var _a, _b;
        if (bundle.type === "chunk" && bundle.isEntry) {
          if (bundle.facadeModuleId) {
            const facadeInfo = this.getModuleInfo(bundle.facadeModuleId);
            if ((_b = (_a = facadeInfo === null || facadeInfo === void 0 ? void 0 : facadeInfo.meta) === null || _a === void 0 ? void 0 : _a.commonjs) === null || _b === void 0 ? void 0 : _b.isCommonJS) {
              analysis.isCommonjs[bundle.name] = true;
            }
          }
        }
      });
      this.emitFile({
        type: "asset",
        fileName: "_analysis.json",
        source: JSON.stringify(analysis)
      });
    }
  }
}
exports.entryAnalysisPlugin = entryAnalysisPlugin;