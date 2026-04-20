/// <reference path="./optional-deps.d.ts" />

import { createDiagramEngine } from './engine';
import {
  GRAPHVIZ_LAYOUT_ENGINES,
  pickGraphvizDiagramOptions,
} from './graphviz';
import type {
  DiagramEngineOptions,
  DiagramRenderService,
  GraphvizCapabilities,
  GraphvizRenderAdapter,
} from './types';

export interface ReactNativeGraphvizAdapterOptions {
  adapter?: GraphvizRenderAdapter;
  loadAdapter?: () => Promise<GraphvizRenderAdapter>;
}

export interface ReactNativeDiagramEngineOptions extends DiagramEngineOptions {
  graphviz?: ReactNativeGraphvizAdapterOptions;
}

export function createReactNativeDiagramEngine(
  options: ReactNativeDiagramEngineOptions = {}
): DiagramRenderService {
  const graphviz = options.graphviz ?? {};

  return createDiagramEngine({
    ...options,
    graphviz: {
      adapter: graphviz.adapter,
      loadAdapter: graphviz.loadAdapter ?? createReactNativeGraphvizAdapterLoader(),
    },
  });
}

function createReactNativeGraphvizAdapterLoader(): () => Promise<GraphvizRenderAdapter> {
  let adapterPromise: Promise<GraphvizRenderAdapter> | null = null;

  return () => {
    if (!adapterPromise) {
      adapterPromise = loadReactNativeGraphvizAdapter();
    }
    return adapterPromise;
  };
}

async function loadReactNativeGraphvizAdapter(): Promise<GraphvizRenderAdapter> {
  const module = await import('graphviz-anywhere-react-native/src/index');

  return {
    async renderToSvg(code, rawOptions) {
      const graphvizOptions = pickGraphvizDiagramOptions(rawOptions);
      return module.renderDot(code, (graphvizOptions.layoutEngine ?? 'dot') as any, 'svg');
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

export { GRAPHVIZ_LAYOUT_ENGINES };
