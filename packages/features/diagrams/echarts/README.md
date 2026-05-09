# Diagram (ECharts) Feature

ECharts 图表支持 Feature（**当前仅 Web**）。

- 语法：使用围栏代码块：

````markdown
```echarts
{ ... ECharts option JSON ... }
```
````

- AST：统一解析为 `diagram` 节点，`engine` 为 `echarts`。
- 渲染：
  - **Web**：`@supramark/engines/echarts` 加载 upstream JS `echarts` 库输出 SVG。
  - **RN**：当前 **未支持**。隐藏 WebView 方案已于 2026-05 退役；后续计划接入 [`@wuba/react-native-echarts`](https://github.com/wuba/react-native-echarts)（成熟的 RN ECharts 包装器，基于 Skia / SVG）。
