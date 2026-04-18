export type DiagramEngineType = 'mermaid' | 'math' | 'dot' | 'graphviz' | string;

export type DiagramRenderFormat = 'svg' | 'error';

export interface DiagramErrorInfo {
  code: 'render_error' | 'unsupported_engine';
  message: string;
  details?: string;
}

export interface DiagramRenderResult {
  id: string;
  engine: DiagramEngineType;
  success: boolean;
  format: DiagramRenderFormat;
  payload: string;
  error?: DiagramErrorInfo;
}

export interface DiagramRenderService {
  render(params: {
    engine: DiagramEngineType;
    code: string;
    options?: Record<string, unknown>;
  }): Promise<DiagramRenderResult>;
}

export type GraphvizAttributeValue = string | number | boolean | { html: string };

export interface GraphvizImageSize {
  name: string;
  width: string | number;
  height: string | number;
}

export interface GraphvizDiagramOptions {
  engine?: string;
  layoutEngine?: string;
  graphvizEngine?: string;
  layout?: string;
  yInvert?: boolean;
  reduce?: boolean;
  graphAttributes?: Record<string, GraphvizAttributeValue>;
  nodeAttributes?: Record<string, GraphvizAttributeValue>;
  edgeAttributes?: Record<string, GraphvizAttributeValue>;
  images?: GraphvizImageSize[];
}

export interface GraphvizCapabilities {
  graphvizVersion?: string;
  engines?: string[];
  formats?: string[];
}

export interface GraphvizRenderAdapter {
  renderToSvg(code: string, options?: GraphvizDiagramOptions): Promise<string>;
  getCapabilities?(): Promise<GraphvizCapabilities>;
}

export interface DiagramEngineOptions {
  graphviz?: {
    adapter?: GraphvizRenderAdapter;
    loadAdapter?: () => Promise<GraphvizRenderAdapter>;
  };
}
