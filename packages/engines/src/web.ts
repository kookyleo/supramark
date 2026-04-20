import { createDiagramEngine } from './engine';
import {
  GRAPHVIZ_LAYOUT_ENGINES,
  pickGraphvizDiagramOptions,
} from './graphviz';
import type {
  DiagramEngineOptions,
  DiagramRenderService,
  GraphvizCapabilities,
  GraphvizDiagramOptions,
  GraphvizRenderAdapter,
} from './types';

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

export interface WebGraphvizAdapterOptions {
  adapter?: GraphvizRenderAdapter;
  loadAdapter?: () => Promise<GraphvizRenderAdapter>;
  loadModule?: () => Promise<unknown>;
  warmup?: boolean;
}

export interface WebDiagramEngineOptions extends DiagramEngineOptions {
  graphviz?: WebGraphvizAdapterOptions;
}

export function createWebDiagramEngine(
  options: WebDiagramEngineOptions = {}
): DiagramRenderService {
  const graphviz = options.graphviz ?? {};

  return createDiagramEngine({
    ...options,
    graphviz: {
      adapter: graphviz.adapter,
      loadAdapter: graphviz.loadAdapter ?? createWebGraphvizAdapterLoader(graphviz),
    },
  });
}

function createWebGraphvizAdapterLoader(
  options: WebGraphvizAdapterOptions
): () => Promise<GraphvizRenderAdapter> {
  let adapterPromise: Promise<GraphvizRenderAdapter> | null = null;

  return () => {
    if (!adapterPromise) {
      adapterPromise = loadWebGraphvizAdapter(options);
    }
    return adapterPromise;
  };
}

async function loadWebGraphvizAdapter(
  options: WebGraphvizAdapterOptions
): Promise<GraphvizRenderAdapter> {
  const module = await import('graphviz-anywhere-web');
  const renderer = (module.createLazyWasmRenderer as (args?: {
    loadModule?: () => Promise<unknown>;
    warmup?: boolean;
  }) => GraphvizWebRenderer)({
    loadModule: options.loadModule,
    warmup: options.warmup,
  });

  return {
    async renderToSvg(code, rawOptions) {
      const graphvizOptions = pickGraphvizDiagramOptions(rawOptions);
      return renderer.render(code, {
        engine: graphvizOptions.layoutEngine,
        format: 'svg',
        yInvert: graphvizOptions.yInvert,
        reduce: graphvizOptions.reduce,
        graphAttributes: graphvizOptions.graphAttributes,
        nodeAttributes: graphvizOptions.nodeAttributes,
        edgeAttributes: graphvizOptions.edgeAttributes,
        images: graphvizOptions.images,
      });
    },
    async getCapabilities() {
      return renderer.getCapabilities();
    },
  };
}

export { GRAPHVIZ_LAYOUT_ENGINES };
