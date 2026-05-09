# Diagram (Vega-Lite) Feature

Vega-Lite / Vega / ChartJS 图表支持 Feature（**当前仅 Web**）。

- 语法：使用围栏代码块：

````markdown
```vega-lite
{ ... Vega-Lite JSON spec ... }
```
````

- AST：统一解析为 `diagram` 节点，`engine` 字段为 `vega-lite` / `vega` / `chart` / `chartjs`。
- 渲染：
  - **Web**：`@supramark/engines/vega-lite` 加载 upstream JS `vega` + `vega-lite` 库输出 SVG。
  - **RN**：当前 **未支持**。隐藏 WebView 方案已于 2026-05 退役；后续计划走纯 JS 路径 `vega.View(spec, { renderer: 'none' }).toSVG()`，输出 SVG 字符串后交给 `react-native-svg` 渲染。

本包当前主要用于：

- 在 FeatureRegistry 中声明「Vega-Lite 图表」能力；
- 通过 `createDiagramVegaLiteFeatureConfig()` 为运行时配置提供强类型桥梁；
- 为文档和示例提供规范化入口。
