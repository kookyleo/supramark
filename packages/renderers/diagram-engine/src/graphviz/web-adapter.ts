import type {
  GraphvizCapabilities,
  GraphvizDiagramOptions,
  GraphvizRenderAdapter,
} from '../types.js';
import { pickGraphvizDiagramOptions } from './index.js';

interface GraphvizWebRenderer {
  render(
    dot: string,
    options?: {
      engine?: string;
      format?: string;
      yInvert?: boolean;
      reduce?: boolean;
      graphAttributes?: GraphvizDiagramOptions['graphAttributes'];
      nodeAttributes?: GraphvizDiagramOptions['nodeAttributes'];
      edgeAttributes?: GraphvizDiagramOptions['edgeAttributes'];
      images?: GraphvizDiagramOptions['images'];
    }
  ): Promise<string>;
  getCapabilities(): Promise<GraphvizCapabilities>;
}

let cached: Promise<GraphvizRenderAdapter> | null = null;

async function loadAdapter(): Promise<GraphvizRenderAdapter> {
  const module = await import('graphviz-anywhere-web');
  const renderer = (module.createLazyWasmRenderer as () => GraphvizWebRenderer)();

  return {
    async renderToSvg(code, rawOptions) {
      const opt = pickGraphvizDiagramOptions(rawOptions);
      return renderer.render(code, {
        engine: opt.layoutEngine,
        format: 'svg',
        yInvert: opt.yInvert,
        reduce: opt.reduce,
        graphAttributes: opt.graphAttributes,
        nodeAttributes: opt.nodeAttributes,
        edgeAttributes: opt.edgeAttributes,
        images: opt.images,
      });
    },
    async getCapabilities() {
      return renderer.getCapabilities();
    },
  };
}

/**
 * Graphviz Web adapter（通过 graphviz-anywhere-web 懒加载 wasm 模块）。
 *
 * 作为 `modules` 项传给 `graphviz()` 工厂：
 *
 * ```ts
 * import graphviz   from '@supramark/diagram-engine/graphviz';
 * import webAdapter from '@supramark/diagram-engine/graphviz/web-adapter';
 *
 * const render = graphviz([webAdapter]);
 * ```
 *
 * 本模块默认导出的是一个**代理 adapter**，首次被调用时才会触发 wasm 下载，
 * 之后的调用共享同一实例。
 */
const webAdapter: GraphvizRenderAdapter = {
  async renderToSvg(code, options) {
    if (!cached) cached = loadAdapter();
    const adapter = await cached;
    return adapter.renderToSvg(code, options);
  },
  async getCapabilities() {
    if (!cached) cached = loadAdapter();
    const adapter = await cached;
    return adapter.getCapabilities?.() ?? { engines: [], formats: ['svg'] };
  },
};

export default webAdapter;
