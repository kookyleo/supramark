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

declare module 'graphviz-anywhere-react-native' {
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

declare module 'graphviz-anywhere-react-native/src/index' {
  export * from 'graphviz-anywhere-react-native';
}
