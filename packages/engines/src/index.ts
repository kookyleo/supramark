// 根入口只导出"包级公共 API"，具体 engine 走 subpath（./mermaid, ./echarts 等）。
// 避免 `export *` 在多个 engine 都有同名 `Options` 时冲突。

// ── 类型 ────────────────────────────────────────────────
export type {
  // v0.2 统一类型
  RenderOptions,
  RenderFn,
  EngineFactory,
  ErrorCode,
  // legacy（phase 5 前 @supramark/web 仍在用）
  DiagramEngineType,
  DiagramRenderFormat,
  DiagramErrorInfo,
  DiagramRenderResult,
  DiagramRenderService,
  GraphvizAttributeValue,
  GraphvizImageSize,
  GraphvizDiagramOptions,
  GraphvizCapabilities,
  GraphvizRenderAdapter,
  DiagramEngineOptions,
} from './types.js';

export { DiagramRenderError } from './types.js';

// ── Legacy runtime（phase 5 迁完后会整批删除） ───────────
export { createDiagramEngine } from './engine.js';
export {
  GRAPHVIZ_LAYOUT_ENGINES,
  renderGraphvizSvg,
  isGraphvizDiagramEngine,
  pickGraphvizDiagramOptions,
  resolveGraphvizLayoutEngine,
} from './graphviz/index.js';
export { renderMermaidSvg } from './mermaid/index.js';
export { renderMathJaxSvg, getSvgViewBoxSize } from './mathjax/index.js';
