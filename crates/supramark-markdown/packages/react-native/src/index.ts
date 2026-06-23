/**
 * @supramark/markdown-native-rn
 *
 * Importing this package side-registers a Markdown parser adapter with
 * `@supramark/core`'s native parser registry. From there, `parse(source)`
 * discovers it and routes Markdown source through the linked
 * `libsupramark_markdown_native` static lib instead of the wasm
 * `@supramark/markdown-web` bundle.
 *
 * Host usage:
 *
 * ```ts
 * import '@supramark/markdown-native-rn';   // side-effect register
 * import { parse } from '@supramark/core';
 *
 * const ast = await parse(markdown);
 * ```
 *
 * Metro config on the host side should stub `@supramark/markdown-web`
 * to an empty module (mirroring how `@kookyleo/*-web` wasm packages
 * are stubbed for the diagram engines) so the wasm bundle never loads.
 *
 * registry API 从 `@supramark/core/rn` 导入（不污染 web 入口，模式对齐
 * `@supramark/engines/rn`）。
 */
import { NativeModules, Platform } from 'react-native';
import { registerNativeParserAdapter } from '@supramark/core/rn';

const LINKING_ERROR =
  `The package '@supramark/markdown-native-rn' doesn't seem to be linked. Make sure:\n\n` +
  Platform.select({
    ios: '- You have run \`pod install\`\n',
    android: '',
    default: '',
  }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

interface NativeSupramarkMarkdownModule {
  parseJson(source: string): Promise<string>;
  getVersion(): Promise<string>;
}

function resolveNative(): NativeSupramarkMarkdownModule {
  // TurboModule (new arch) first.
  try {
    const turbo = require('./NativeSupramarkMarkdown').default;
    if (turbo) return turbo as NativeSupramarkMarkdownModule;
  } catch {
    // not codegen'd or new-arch disabled — fall through
  }
  // Bridge-based fallback (old arch).
  const bridged = NativeModules.SupramarkMarkdownNative;
  if (!bridged) {
    return new Proxy({} as NativeSupramarkMarkdownModule, {
      get() {
        throw new Error(LINKING_ERROR);
      },
    });
  }
  return bridged as NativeSupramarkMarkdownModule;
}

const native = resolveNative();

registerNativeParserAdapter({
  parseJson: async (source: string) => native.parseJson(source),
  getVersion: async () => native.getVersion(),
});

/** Re-exported for diagnostics (returns the linked `supramark_markdown_version()`). */
export const getNativeVersion = (): Promise<string> => native.getVersion();

/** Direct access to the native parse entry, bypassing the registry. */
export const parseJsonNative = (source: string): Promise<string> => native.parseJson(source);
