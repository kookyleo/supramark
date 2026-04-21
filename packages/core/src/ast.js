/**
 * Diagram 引擎标识符
 *
 * - 与 parseMarkdown() 中 isDiagramLanguage() 的列表保持一致；
 * - 允许扩展字符串，方便宿主添加自定义引擎。
 */
export const BUILT_IN_DIAGRAM_ENGINES = [
    'mermaid',
    'plantuml',
    'vega',
    'vega-lite',
    'echarts',
    'chart',
    'chartjs',
    'dot',
    'graphviz',
    'd2',
];
/**
 * 判断给定 engine 是否为内置图表引擎。
 */
export function isBuiltInDiagramEngine(engine) {
    const normalized = String(engine).toLowerCase();
    // 这里的类型断言仅用于通过 TS 检查，运行时仍然按字符串比较。
    return BUILT_IN_DIAGRAM_ENGINES.includes(normalized);
}
const warnedDiagramEngines = new Set();
/**
 * 当使用非内置 diagram engine 时给出一次性告警。
 *
 * - 不阻止自定义引擎，仅在第一次遇到未知 engine 时通过 console.warn 提示；
 * - 方便在调试阶段发现拼写错误或未声明的引擎。
 */
export function warnIfUnknownDiagramEngine(engine, context) {
    if (isBuiltInDiagramEngine(engine))
        return;
    const normalized = String(engine).toLowerCase();
    if (warnedDiagramEngines.has(normalized))
        return;
    warnedDiagramEngines.add(normalized);
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        const details = context ? `（${context}）` : '';
        console.warn(`[supramark] 未知 diagram engine "${engine}"${details}。` +
            '如果这是自定义引擎，请确保：' +
            '1) 在解析层将其识别为 diagram；' +
            '2) 为其定义对应的 Feature 与渲染实现。');
    }
}
/**
 * Admonition 类型常量（供 :::note, :::warning 等容器扩展使用）
 *
 * 注意：Admonition 现在统一使用 SupramarkContainerNode，
 * 通过 name 字段区分类型（'note', 'tip', 'warning' 等）。
 */
export const SUPRAMARK_ADMONITION_KINDS = ['note', 'tip', 'info', 'warning', 'danger'];
//# sourceMappingURL=ast.js.map