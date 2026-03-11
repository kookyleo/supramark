# Supermark 改动清单

## 最新增量

- RN diagram worker 已注册的浏览器型引擎统一优先走 headless WebView。
- Vega / Vega-Lite 已接入 headless WebView，本地在 WebView 内完成编译与 SVG 渲染，不再走 Kroki 远端服务。
- DOT / Graphviz 已接入 headless WebView，本地通过 Viz.js 生成 SVG，不再走 Kroki 远端服务。

---

本次改动共 22 个文件，按类型分类如下。

---

## 一、纯 TS 类型修复（7 个文件）

改动最小，只修了类型注解，不影响运行时行为。

- `packages/core/src/feature.ts` — `PlatformRenderer` 接口新增 `platform?` 可选字段
- `packages/features/feature-core-markdown/src/feature.ts` — `output` → `(output: unknown)` ×5
- `packages/features/feature-definition-list/src/feature.ts` — `output` → `(output: unknown)` ×2
- `packages/features/feature-emoji/src/feature.ts` — `output` → `(output: unknown)` ×2
- `packages/features/feature-footnote/src/feature.ts` — `output` → `(output: unknown)` ×3
- `packages/features/feature-gfm/src/feature.ts` — `output` → `(output: unknown)` ×3
- `packages/features/feature-math/src/feature.ts` — `output` → `(output: unknown)` ×4

## 二、类型 hack — ContainerFeature 交叉类型兼容（2 个文件）

`ContainerFeature & SupramarkFeature` 交叉类型的 `selector` 参数不兼容，用 `as unknown as` 绕过。

- `packages/features/feature-admonition/src/feature.ts`
- `packages/features/feature-weather/src/feature.ts`

## 三、RN 运行时兼容 — Hermes/RN 环境缺失 API 的 polyfill（3 个文件）

- `packages/renderers/diagram-engine/src/engines/plantuml.ts`
  - 新增 `utf8Encode()` polyfill（Hermes 无 TextEncoder）
  - `deflateRaw` 从 `node:zlib` 改为 pako fallback
  - `CompressionStream.write` 修复 ArrayBuffer 兼容
- `packages/renderers/diagram-engine/src/engines/echarts.ts`
  - 新增 `resolveEchartsApi()` 处理 ESM default export 嵌套（`mod.default.default`）
  - 加运行时 API 可用性检查
- `packages/renderers/diagram-engine/src/engines/vega-lite.ts`
  - 新增 `resolveVegaApi()` / `resolveVegaLiteApi()` 同上
  - 加运行时 API 可用性检查

## 四、RN 渲染改进 — 修复渲染 bug 和优化 UX（4 个文件）

- `packages/renderers/rn/src/Supramark.tsx`
  - 列表渲染重写：支持有序列表序号、任务列表 checkbox
  - `list_item` 子节点从 `renderInlineNodes` 改为递归 `renderNode`（支持嵌套块级元素）
  - `mergedContainerRenderers` 简化（去掉从 config.features 自动提取的逻辑）
  - 定义列表和脚注的子节点也改为递归渲染
- `packages/renderers/rn/src/MathBlock.tsx`
  - 错误处理改为优雅降级：去掉 error state 和错误 UI，渲染失败时显示 TeX 源码
  - 新增 `codeBlock`/`codeText` 样式
- `packages/renderers/rn/src/DiagramNode.tsx`
  - `useDiagramRender()` 解构改为整体引用，修复 hook 引用稳定性
- `packages/renderers/rn/src/svgUtils.ts`
  - SVG 清理增强：先保留 `<text>` 节点，再清除 XML prolog/doctype/metadata/注释
  - 折叠标签间空白文本节点（react-native-svg 不支持裸字符串子节点）

## 五、Admonition RN 渲染完整实现（1 个文件）

- `packages/features/feature-admonition/src/runtime.rn.tsx`
  - 从简陋的占位实现重写为完整的 admonition 卡片
  - 5 种 kind（note/tip/info/warning/danger）各有主题色和图标
  - 新增 `normalizeNode`/`normalizeChildren` 处理 RN 不允许裸字符串子节点的问题

## 六、RN 导出补充（1 个文件）

- `packages/core/src/index.rn.ts`
  - 新增导出 `extractContainerInnerText`（container 相关）
  - 新增导出 `LRUCache`/`createCacheKey`/`simpleHash`（diagram-engine 在 RN 侧需要的缓存工具）

## 七、Web 渲染器小调整（1 个文件）

- `packages/renderers/web/src/Supramark.tsx`
  - `SUPRAMARK_ADMONITION_KINDS` 从 type import 改为 value import
  - `mergedContainerRenderers` 简化（同 RN 侧）
  - `renderNode` 参数类型放宽为 `any`

## 八、类型声明补充（1 个文件）

- `types/diagram-optional-deps.d.ts`
  - 新增 `markdown-it-container`、`markdown-it-texmath`、`markdown-it-footnote`、`markdown-it-deflist`、`pako` 的 ambient module 声明

## 九、新文件（1 个文件）

- `packages/renderers/rn/src/generatedContainers.ts`
  - 空的 fallback 导出文件，`index.ts` 里 `export * from './generatedContainers'` 需要它存在

## 十、RN 数学公式渲染 — 从本地 KaTeX 改为远程 SVG/PNG 服务（3 个文件）

原方案通过 `diagram-engine` 调用 KaTeX `renderToString`，但 KaTeX 输出的是 HTML 格式，
而 `MathBlock.tsx` 仅接受 SVG（`result.format === 'svg'`），导致 RN 端公式永远降级显示 TeX 源码。
改为通过 CodeCogs 公共服务远程渲染，RN 端零本地数学库依赖。

## 十一、Graphviz/dot RN 服务端渲染 fallback（2 个文件）

Hermes 不支持 WebAssembly，`@viz-js/viz` 无法在 RN 上运行。改为在 WASM 不可用时自动回退到 Kroki 服务端渲染。

## 十二、Vega / Vega-Lite RN 服务端渲染（2 个文件）

Hermes 引擎（Android）下 vega 和 vega-lite 的本地 JS SSR（`vega.View.toSVG()`）会挂起，
iOS 使用 JSC 引擎不受影响。改为非浏览器环境统一走 Kroki 远端渲染，Web 端保持本地渲染不变。

## 十三、PlantUML RN 远端渲染完整实现（1 个文件）

PlantUML 始终使用远端服务渲染（将 UML 源码编码为 URL 后请求 PlantUML 服务器获取 SVG）。
本次改动完整实现了跨平台兼容的编码和渲染链路。

## 十四、通用 Headless WebView 图表渲染架构 + ECharts 双路径分流

### 背景

部分图表库（ECharts、Vega 等）的纯 JS SSR 在 Hermes（Android）下会挂起，但在 JSC（iOS）下正常。
采用 JS 引擎检测（`'HermesInternal' in globalThis`）实现双路径分流：

- **Hermes（Android）**：通过常驻的隐藏 1×1 WebView 加载图表库 CDN，在 WebView 内渲染后将 SVG 通过 postMessage 传回 RN
- **JSC（iOS）**：直接走 diagram-engine 的纯 JS SSR，零 WebView 开销

### 架构设计

将 WebView bridge 泛化为通用架构，通过 `bridges/` 目录按 engine 拆分渲染逻辑，
单个 WebView 实例服务所有已注册的 engine。新增 engine 只需在 `bridges/` 下新建文件并注册。

```
rn-diagram-worker/src/
├── bridges/
│   ├── types.ts          ← BridgeEngine 接口定义
│   ├── echarts.ts        ← ECharts WebView 内渲染逻辑
│   ├── vega.ts           ← Vega / Vega-Lite 占位
│   └── index.ts          ← 统一导出
├── DiagramWebViewBridge.tsx  ← 通用无头 WebView 组件
├── DiagramRenderContext.tsx  ← Provider + hooks
├── types.ts
└── index.ts
```
