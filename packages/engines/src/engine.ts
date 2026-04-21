import { isGraphvizDiagramEngine, renderGraphvizSvg } from './graphviz';
import { renderMathJaxSvg } from './mathjax';
import { renderMermaidSvg } from './mermaid';
import type {
  DiagramEngineOptions,
  DiagramEngineType,
  DiagramRenderFn,
  DiagramRenderResult,
  DiagramRenderService,
  GraphvizRenderAdapter,
} from './types';

class LocalDiagramEngine implements DiagramRenderService {
  private nextId = 0;
  private graphvizAdapterPromise: Promise<GraphvizRenderAdapter> | null = null;
  private echartsRenderPromise: Promise<DiagramRenderFn> | null = null;
  private vegaLiteRenderPromise: Promise<DiagramRenderFn> | null = null;
  private plantumlRenderPromise: Promise<DiagramRenderFn> | null = null;

  constructor(private readonly options: DiagramEngineOptions = {}) {}

  async render(params: {
    engine: DiagramEngineType;
    code: string;
    options?: Record<string, unknown>;
  }): Promise<DiagramRenderResult> {
    const id = `de_${Date.now()}_${this.nextId++}`;
    const normalizedEngine = String(params.engine || '').toLowerCase();

    try {
      switch (normalizedEngine) {
        case 'mermaid': {
          const payload = await renderMermaidSvg(params.code, params.options);
          return {
            id,
            engine: normalizedEngine,
            success: true,
            format: 'svg',
            payload,
          };
        }
        case 'math': {
          const payload = await renderMathJaxSvg(params.code, {
            displayMode: params.options?.displayMode === true,
          });
          return {
            id,
            engine: normalizedEngine,
            success: true,
            format: 'svg',
            payload,
          };
        }
        case 'echarts': {
          const render = await this.getEchartsRender();
          if (!render) return this.unsupported(id, normalizedEngine, params.engine);
          const payload = await render(params.code, params.options);
          return { id, engine: normalizedEngine, success: true, format: 'svg', payload };
        }
        case 'vega-lite':
        case 'vegalite':
        case 'vega': {
          const render = await this.getVegaLiteRender();
          if (!render) return this.unsupported(id, normalizedEngine, params.engine);
          const opts =
            normalizedEngine === 'vega'
              ? { ...(params.options ?? {}), dialect: 'vega' as const }
              : params.options;
          const payload = await render(params.code, opts);
          return { id, engine: normalizedEngine, success: true, format: 'svg', payload };
        }
        case 'plantuml': {
          const render = await this.getPlantumlRender();
          if (!render) return this.unsupported(id, normalizedEngine, params.engine);
          const payload = await render(params.code, params.options);
          return { id, engine: normalizedEngine, success: true, format: 'svg', payload };
        }
        default: {
          if (isGraphvizDiagramEngine(normalizedEngine)) {
            const adapter = await this.getGraphvizAdapter();
            if (!adapter) {
              return {
                id,
                engine: normalizedEngine,
                success: false,
                format: 'error',
                payload:
                  'Graphviz adapter is not configured for @supramark/engines.',
                error: {
                  code: 'unsupported_engine',
                  message: `${params.engine} requires a Graphviz adapter`,
                  details:
                    'Use @supramark/engines/web or @supramark/engines/rn to create the engine.',
                },
              };
            }

            const payload = await renderGraphvizSvg(params.code, params.options, adapter);
            return {
              id,
              engine: normalizedEngine,
              success: true,
              format: 'svg',
              payload,
            };
          }

          return {
            id,
            engine: normalizedEngine,
            success: false,
            format: 'error',
            payload: `Unsupported diagram engine: ${params.engine}`,
            error: {
              code: 'unsupported_engine',
              message: `${params.engine} is not supported by @supramark/engines`,
            },
          };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        id,
        engine: normalizedEngine,
        success: false,
        format: 'error',
        payload: message,
        error: {
          code: 'render_error',
          message: `${params.engine} rendering failed`,
          details: message,
        },
      };
    }
  }

  private async getGraphvizAdapter() {
    if (this.options.graphviz?.adapter) {
      return this.options.graphviz.adapter;
    }

    if (!this.options.graphviz?.loadAdapter) {
      return null;
    }

    if (!this.graphvizAdapterPromise) {
      this.graphvizAdapterPromise = this.options.graphviz.loadAdapter();
    }

    return this.graphvizAdapterPromise;
  }

  private async getEchartsRender(): Promise<DiagramRenderFn | null> {
    if (this.options.echarts?.render) return this.options.echarts.render;
    if (!this.options.echarts?.loadRender) return null;
    if (!this.echartsRenderPromise) {
      this.echartsRenderPromise = this.options.echarts.loadRender();
    }
    return this.echartsRenderPromise;
  }

  private async getVegaLiteRender(): Promise<DiagramRenderFn | null> {
    if (this.options.vegaLite?.render) return this.options.vegaLite.render;
    if (!this.options.vegaLite?.loadRender) return null;
    if (!this.vegaLiteRenderPromise) {
      this.vegaLiteRenderPromise = this.options.vegaLite.loadRender();
    }
    return this.vegaLiteRenderPromise;
  }

  private async getPlantumlRender(): Promise<DiagramRenderFn | null> {
    if (this.options.plantuml?.render) return this.options.plantuml.render;
    if (!this.options.plantuml?.loadRender) return null;
    if (!this.plantumlRenderPromise) {
      this.plantumlRenderPromise = this.options.plantuml.loadRender();
    }
    return this.plantumlRenderPromise;
  }

  private unsupported(id: string, normalized: string, original: DiagramEngineType): DiagramRenderResult {
    return {
      id,
      engine: normalized,
      success: false,
      format: 'error',
      payload: `Unsupported diagram engine: ${original}`,
      error: {
        code: 'unsupported_engine',
        message: `${original} runtime not configured for @supramark/engines`,
        details: `Pass \`${normalized}: { render, loadRender }\` to createDiagramEngine() or ensure the peer dependency is installed.`,
      },
    };
  }
}

export function createDiagramEngine(options?: DiagramEngineOptions): DiagramRenderService {
  return new LocalDiagramEngine(options);
}
