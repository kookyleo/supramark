import type {
  GraphvizDiagramOptions,
  GraphvizRenderAdapter,
} from './types';

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
