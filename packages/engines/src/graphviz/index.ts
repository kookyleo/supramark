import type {
  GraphvizDiagramOptions,
  GraphvizRenderAdapter,
  RenderOptions,
} from '../types.js';
import { DiagramRenderError } from '../types.js';

type GraphvizOptionSource = GraphvizDiagramOptions | Record<string, unknown>;

export const GRAPHVIZ_LAYOUT_ENGINES = [
  'dot',
  'neato',
  'fdp',
  'sfdp',
  'circo',
  'twopi',
  'osage',
  'patchwork',
] as const;

export function isGraphvizDiagramEngine(engine: string): boolean {
  const normalized = String(engine || '').toLowerCase();
  return normalized === 'dot' || normalized === 'graphviz';
}

export function resolveGraphvizLayoutEngine(
  options?: GraphvizOptionSource
): string {
  const candidates = [
    options?.layoutEngine,
    options?.graphvizEngine,
    options?.layout,
    options?.engine,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return 'dot';
}

export function pickGraphvizDiagramOptions(
  options?: GraphvizOptionSource
): GraphvizDiagramOptions {
  const layoutEngine = resolveGraphvizLayoutEngine(options);
  const picked: GraphvizDiagramOptions = { layoutEngine };

  if (typeof options?.yInvert === 'boolean') {
    picked.yInvert = options.yInvert;
  }
  if (typeof options?.reduce === 'boolean') {
    picked.reduce = options.reduce;
  }
  if (isRecord(options?.graphAttributes)) {
    picked.graphAttributes = options.graphAttributes;
  }
  if (isRecord(options?.nodeAttributes)) {
    picked.nodeAttributes = options.nodeAttributes;
  }
  if (isRecord(options?.edgeAttributes)) {
    picked.edgeAttributes = options.edgeAttributes;
  }
  if (Array.isArray(options?.images)) {
    picked.images = options.images.filter(isGraphvizImageSize);
  }

  return picked;
}

export async function renderGraphvizSvg(
  code: string,
  options: GraphvizOptionSource | undefined,
  adapter: GraphvizRenderAdapter
): Promise<string> {
  return adapter.renderToSvg(code, pickGraphvizDiagramOptions(options));
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGraphvizImageSize(value: unknown): value is NonNullable<GraphvizDiagramOptions['images']>[number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === 'string' &&
    (typeof value.width === 'string' || typeof value.width === 'number') &&
    (typeof value.height === 'string' || typeof value.height === 'number')
  );
}

// ============================================================================
// v0.2 unified engine factory（见 docs/architecture/ENGINES_AND_CLI_PLAN.md）
// ============================================================================

/**
 * Graphviz engine 的渲染选项（在通用 RenderOptions 基础上加平台 / 布局选项）。
 */
export interface Options extends RenderOptions, GraphvizDiagramOptions {}

/**
 * Graphviz engine 工厂。
 *
 * `modules` 必须包含至少一个 `GraphvizRenderAdapter`，通常来自：
 * - `@supramark/engines/graphviz/web-adapter`
 * - `@supramark/engines/graphviz/rn-adapter`
 *
 * @example
 * ```ts
 * import graphviz  from '@supramark/engines/graphviz';
 * import webAdapter from '@supramark/engines/graphviz/web-adapter';
 *
 * const render = graphviz([webAdapter]);
 * const svg = await render('digraph G { a -> b }');
 * ```
 */
export default function graphviz(modules?: unknown[]) {
  const adapter = modules?.find((m): m is GraphvizRenderAdapter => {
    return (
      typeof m === 'object' &&
      m !== null &&
      typeof (m as GraphvizRenderAdapter).renderToSvg === 'function'
    );
  });

  return async (code: string, options?: Options): Promise<string> => {
    options?.signal?.throwIfAborted();
    if (!adapter) {
      throw new DiagramRenderError(
        'Graphviz engine requires an adapter module. ' +
          'Pass it via modules, e.g. graphviz([webAdapter]).',
        { engine: 'graphviz', code: 'engine_unavailable' }
      );
    }
    try {
      return await renderGraphvizSvg(code, options, adapter);
    } catch (e) {
      if (e instanceof DiagramRenderError) throw e;
      throw new DiagramRenderError(
        `Graphviz render failed: ${e instanceof Error ? e.message : String(e)}`,
        {
          engine: 'graphviz',
          code: 'render_error',
          input: code.slice(0, 200),
          cause: e,
        }
      );
    }
  };
}
