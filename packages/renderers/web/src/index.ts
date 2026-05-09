export * from './Supramark.js';
export * from './DiagramEngineProvider.js';
export * from './classNames.js';
export * from './ErrorBoundary.js';
// Math is now rendered SSR-side via @supramark/engines/mathjax → inline
// SVG (no CDN script, no DOM-side KaTeX runtime). The legacy
// buildMathSupportScripts() helper has been retired.
export { parseMarkdown } from '@supramark/core';
export type { SupramarkRootNode } from '@supramark/core';
