"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
/**
 * TurboModule spec for the Graphviz native module (New Architecture).
 *
 * This interface defines the contract between JS and native code.
 * For the old architecture, we fall back to NativeModules.
 */
var _default = exports.default = _reactNative.TurboModuleRegistry.getEnforcing('GraphvizNative');
//# sourceMappingURL=NativeGraphviz.js.map