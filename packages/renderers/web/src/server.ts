/**
 * @supramark/web/server
 *
 * Server-side rendering (SSR) entry point.
 *
 * Converts Markdown to an HTML string in Node.js. Use from SSR hosts
 * that pre-render at build/request time.
 *
 * @example
 * ```typescript
 * import { parseMarkdown, astToHtml, buildDiagramSupportScripts } from '@supramark/web/server';
 *
 * // Parse Markdown into a Supramark AST.
 * const ast = await parseMarkdown(markdown);
 *
 * // Render the AST to an HTML string.
 * const htmlContent = astToHtml(ast);
 *
 * // Generate diagram support scripts (only if diagram features are
 * // configured).
 * const scripts = buildDiagramSupportScripts();
 *
 * // Compose the full SSR document.
 * const html = `
 *   <!DOCTYPE html>
 *   <html>
 *     <head>${scripts.headScript}</head>
 *     <body>
 *       ${htmlContent}
 *       ${scripts.bodyScript}
 *     </body>
 *   </html>
 * `;
 * ```
 */

// Core parsing API re-exported from @supramark/core for convenience.
export { parseMarkdown } from '@supramark/core';
export type { SupramarkRootNode, SupramarkNode } from '@supramark/core';

// HTML rendering.
export { astToHtml, escapeHtml } from './html.js';

// Math is now rendered SSR-side via @supramark/engines/mathjax → inline
// SVG (no CDN script, no DOM-side KaTeX runtime). The legacy
// buildMathSupportScripts() helper has been retired.
