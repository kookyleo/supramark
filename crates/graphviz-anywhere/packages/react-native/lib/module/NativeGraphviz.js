"use strict";

import { TurboModuleRegistry } from 'react-native';

/**
 * TurboModule spec for the Graphviz native module (New Architecture).
 *
 * This interface defines the contract between JS and native code.
 * For the old architecture, we fall back to NativeModules.
 */

export default TurboModuleRegistry.getEnforcing('GraphvizNative');
//# sourceMappingURL=NativeGraphviz.js.map