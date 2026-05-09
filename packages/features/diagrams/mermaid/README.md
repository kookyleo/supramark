# Mermaid Feature

Mermaid 图表支持 Feature。

- 语法：使用围栏代码块：

````markdown
```mermaid
graph TD
  A[Start] --> B{Check}
  B -->|Yes| C[Ship]
  B -->|No| D[Fix]
```
````

- AST：统一解析为 `diagram` 节点，`engine` 为 `mermaid`。
- 渲染：
  - **Web**：`@supramark/engines` 调用 `@kookyleo/mermaid-little-web`（Rust → wasm）输出 SVG，零 DOM / 零 headless 浏览器 / 零 upstream JS Mermaid bundle。
  - **RN**：当前 **未支持**。隐藏 WebView 方案（`@supramark/rn-diagram-worker`）已于 2026-05 退役；后续替代方案是 `mermaid-little` 的 native FFI 绑定（追踪 `crates/mermaid-little/UPSTREAM.md`）。

本包当前主要用于：

- 在 FeatureRegistry 中声明「Mermaid 图表」能力；
- 通过 `createMermaidFeatureConfig()` 为运行时配置提供强类型入口；
- 让 Web / RN 的 diagram gating 能和其它 family 使用同一套规则。
