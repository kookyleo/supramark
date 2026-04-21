declare module 'beautiful-mermaid' {
  export function renderMermaid(
    code: string,
    options?: Record<string, unknown>
  ): Promise<string> | string;

  export function renderMermaidSVG(
    code: string,
    options?: Record<string, unknown>
  ): Promise<string> | string;

  export function renderMermaidSync(
    code: string,
    options?: Record<string, unknown>
  ): Promise<string> | string;
}

declare module 'mathjax-full/js/mathjax.js' {
  export const mathjax: {
    document(input?: string, options?: Record<string, unknown>): any;
  };
}

declare module 'mathjax-full/js/input/tex.js' {
  export class TeX {
    constructor(options?: Record<string, unknown>);
  }
}

declare module 'mathjax-full/js/output/svg.js' {
  export class SVG {
    constructor(options?: Record<string, unknown>);
  }
}

declare module 'mathjax-full/js/adaptors/liteAdaptor.js' {
  export function liteAdaptor(): any;
}

declare module 'mathjax-full/js/handlers/html.js' {
  export function RegisterHTMLHandler(adaptor: any): void;
}

declare module 'mathjax-full/js/input/tex/AllPackages.js' {
  export const AllPackages: unknown;
}

declare module '@kookyleo/plantuml-little-web' {
  /** wasm-bindgen default async initialiser. */
  const init: (input?: unknown) => Promise<unknown>;
  export default init;

  /** Convert PlantUML source to an SVG string. */
  export function convert(puml: string): Promise<string> | string;

  /** Alternative names the package may expose depending on build shape. */
  export function render(puml: string): Promise<string> | string;
  export function renderSvg(puml: string): Promise<string> | string;

  /** Register a Graphviz bridge (dot -> svg). */
  export function setGraphvizBridge(
    fn: (dot: string, engine?: string) => Promise<string> | string
  ): void;
  export function set_graphviz_bridge(
    fn: (dot: string, engine?: string) => Promise<string> | string
  ): void;
  export function setGraphvizRenderer(
    fn: (dot: string, engine?: string) => Promise<string> | string
  ): void;
  export function registerGraphviz(
    fn: (dot: string, engine?: string) => Promise<string> | string
  ): void;
}

declare module '@kookyleo/d2-little-web' {
  /** wasm-bindgen default async initialiser. */
  const init: (input?: unknown) => Promise<unknown>;
  export default init;

  /** Convert D2 source to an SVG string. */
  export function convert(d2: string): Promise<string> | string;

  /** Alternative names the package may expose depending on build shape. */
  export function render(d2: string): Promise<string> | string;
  export function renderSvg(d2: string): Promise<string> | string;
}

declare module '@kookyleo/graphviz-anywhere-rn' {
  export type GraphvizEngine =
    | 'dot'
    | 'neato'
    | 'fdp'
    | 'sfdp'
    | 'circo'
    | 'twopi'
    | 'osage'
    | 'patchwork';

  export type GraphvizFormat =
    | 'svg'
    | 'png'
    | 'pdf'
    | 'ps'
    | 'json'
    | 'dot'
    | 'xdot'
    | 'plain';

  export function renderDot(
    dot: string,
    engine?: GraphvizEngine,
    format?: GraphvizFormat
  ): Promise<string>;

  export function getVersion(): Promise<string>;
}
