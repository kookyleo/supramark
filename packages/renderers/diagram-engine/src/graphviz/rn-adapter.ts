/// <reference path="../optional-deps.d.ts" />

import type {
  GraphvizCapabilities,
  GraphvizRenderAdapter,
} from '../types.js';
import { GRAPHVIZ_LAYOUT_ENGINES, pickGraphvizDiagramOptions } from './index.js';

let cached: Promise<GraphvizRenderAdapter> | null = null;

async function loadAdapter(): Promise<GraphvizRenderAdapter> {
  const module = await import('graphviz-anywhere-react-native/src/index');

  return {
    async renderToSvg(code, rawOptions) {
      const opt = pickGraphvizDiagramOptions(rawOptions);
      return module.renderDot(code, (opt.layoutEngine ?? 'dot') as any, 'svg');
    },
    async getCapabilities(): Promise<GraphvizCapabilities> {
      return {
        graphvizVersion:
          typeof module.getVersion === 'function' ? await module.getVersion() : undefined,
        engines: [...GRAPHVIZ_LAYOUT_ENGINES],
        formats: ['svg'],
      };
    },
  };
}

/**
 * Graphviz RN adapter（通过 graphviz-anywhere-react-native 的 native module）。
 *
 * 作为 `modules` 项传给 `graphviz()` 工厂。首次调用触发 native 初始化。
 */
const rnAdapter: GraphvizRenderAdapter = {
  async renderToSvg(code, options) {
    if (!cached) cached = loadAdapter();
    const adapter = await cached;
    return adapter.renderToSvg(code, options);
  },
  async getCapabilities() {
    if (!cached) cached = loadAdapter();
    const adapter = await cached;
    return adapter.getCapabilities?.() ?? { engines: [...GRAPHVIZ_LAYOUT_ENGINES], formats: ['svg'] };
  },
};

export default rnAdapter;
