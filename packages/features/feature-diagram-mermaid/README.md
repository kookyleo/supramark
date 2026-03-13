# `@supramark/feature-diagram-mermaid`

为 supramark 提供 ` ```mermaid ` 围栏代码块支持，解析后产出统一的 `diagram` 节点，`engine = "mermaid"`。

## 实现方式

Web 环境：

- 通过 `@supramark/diagram-engine` 的 `mermaid` 引擎直接渲染
- 引擎内部动态加载 `beautiful-mermaid`
- 在当前 JS 运行时中直接生成 SVG

React Native 环境：

- 直接走 `@supramark/diagram-engine` 的 `mermaid` 引擎本地渲染
- 在当前 JS/Hermes 运行时中调用 `beautiful-mermaid`
- 生成 SVG 后在本地做一层样式实化和清理
- RN 侧最终使用 `react-native-svg` 渲染静态 SVG

这样处理后，Web 和 RN 都统一走本地 Mermaid 引擎，只是在 RN 侧额外补了针对 `react-native-svg` 的兼容清理。
