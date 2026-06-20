# Diagram Engine 架构目标

## 背景

当前仓库中的图表渲染已经收敛到 `@supramark/engines`：

- React Native 侧通过 native FFI adapter 或 JS SVG-string engine 输出 SVG；
- Web 侧通过 wasm / JS engine 输出 SVG；
- renderer 只消费 SVG，不直接维护图表库运行环境。

这份文档保留为架构约束：新增 diagram family 必须接入统一 engine 路线。

## 目标

本次架构收敛的目标只有两条。

### A. 所有 diagram family 的生成过程都进入 `@supramark/engines`

所有 diagram family 都应该统一由 `@supramark/engines` 负责把源代码转换为 SVG 输出。

统一接口目标：

```ts
render({
  engine,
  code,
  options,
}) => Promise<{
  id: string
  engine: string
  success: boolean
  format: 'svg' | 'error'
  payload: string
}>
```

这里的 `engine` 包括但不限于：

- `mermaid`
- `dot` / `graphviz`
- `vega`
- `vega-lite`
- `echarts`
- `plantuml`

补充说明：

- `Math / LaTeX` 虽然不属于 `diagram` AST family，但也建议沿用同样的 `engine-first` 路线，即由 `@supramark/engines` 产出 SVG，再由各平台展示。

### B. 所有 diagram 的消费，无论 RN 还是 Web，都只从 `@supramark/engines` 获取 SVG

`@supramark/rn` 和 `@supramark/web` 的职责应该收敛为“消费 SVG 输出”，而不是各自直接运行图表库。

也就是说：

- `@supramark/rn`
  - 输入：AST 节点
  - 调用：`@supramark/engines`
  - 输出：React Native 组件树与 SVG 展示
- `@supramark/web`
  - 输入：AST 节点
  - 调用：`@supramark/engines`
  - 输出：React DOM / SSR HTML 与 SVG 展示

Renderer 侧不负责：

- 自己引 Mermaid / Vega / ECharts 等渲染库
- 自己拼接脚本并扫描 DOM
- 自己维护额外的图表执行环境

## 目标结构

目标分层如下：

```text
@supramark/core
  └─ 负责 AST、parser、feature 配置

@supramark/engines
  └─ 负责 diagram source -> svg

@supramark/rn
  └─ 负责 AST -> 组件 + 展示 SVG

@supramark/web
  └─ 负责 AST -> React/HTML + 展示 SVG
```

在这个结构下，`@supramark/engines` 是唯一 diagram 渲染入口。

## SVG 尺寸契约（describe, don't mutate）

引擎层对 SVG 只做一件事：**描述，不改写**。`render()` 返回的 SVG 原样透传（忠实于上游 / 原生输出），尺寸信息作为**只读元数据**挂在 `size` 上；外围尺寸的布局决策统一交给纯函数 `computeDiagramBox`，由各平台展示层调用。

这样图表的"渲染数据"与"布局决策"彻底分离：vendored 的 `*-little` / `graphviz-anywhere` 模块专心跟进原生，引擎层不污染其输出，尺寸风格的统一只在更上层完成。

### 契约

```ts
interface DiagramRenderResult {
  payload: string;                 // 原生 SVG，零改写
  size?: SvgIntrinsicSize | null;  // 只读解析；解析不出比例时为 null
  // ...id / engine / success / format / error
}

interface SvgIntrinsicSize {
  width: number;
  height: number;
  aspectRatio: number;             // width / height
}
```

`size` 由 `parseSvgSize()` 从 `<svg>` 的 `viewBox`（优先）或 `width/height` 属性只读解析，百分比 / em 等相对单位不计入。当前所有图表引擎（mermaid / d2 / plantuml / dot / echarts / vega-lite）都输出 `viewBox`，因此 `size` 稳定可得；`null` 分支仅为未知引擎兜底。

> mermaid 会输出 `width="100%"`，所以 `viewBox` 必须优先于 `width/height`，否则比例会被 `100%` 算错。

### 示例用法

下游 web / RN 共用同一套尺寸策略：

```ts
import { computeDiagramBox } from '@supramark/engines';

const result = await engine.render({ engine: 'd2', code: 'x -> y' });
// result.size === { width: 57, height: 224, aspectRatio: 0.254 }

const box = computeDiagramBox({
  size: result.size,
  containerWidth,   // 容器实测宽度
  maxHeight: 500,   // 可选：高瘦图高度上限，默认 500
});
// box === { width: containerWidth, height: min(containerWidth / aspectRatio, 500) }
```

- **RN**：`<SvgXml xml={svg} width={box.width} height={box.height} />`
- **Web**：外层容器用 `aspectRatio: size.width / size.height` 预留比例，内联 SVG 铺满即可。
- `size` 为 `null` 时回退 `fallbackHeight`（默认 300），不会崩。

### 边界

- **引擎层永不把 width/height 注入回 SVG**（旧的 D2 专用补丁 `injectD2Dimensions` 已移除）。
- 需要不同尺寸语义的（如 math 随字号 em 缩放）走各自展示层，不套用 `computeDiagramBox`，也不进入本契约。
- 平台差异只剩"展示层适配"：web 仅在缺 `viewBox` 时单向补一个 + 加填充样式；RN 为 `react-native-svg` 做必要规范化。

## 维护原则

1. 新增 diagram 能力时，不再扩散到新的 renderer 私有实现。
2. 任何 `source -> svg` 能力都应迁入 `@supramark/engines`。
3. `@supramark/rn` 与 `@supramark/web` 只通过 `@supramark/engines.render()` 获取结果。
4. 平台差异只体现在 engine adapter 与 SVG 展示层。
5. 引擎层对 SVG **只描述不改写**：尺寸走 `size` 元数据 + `computeDiagramBox`，详见上文「SVG 尺寸契约」。

## 迁移顺序

建议按以下顺序推进。

### 第一阶段：统一入口

- 为 `@supramark/engines` 建立统一 `render()` / `createDiagramEngine()` 入口
- 已完成本地化的 `mermaid`、`math`、`latex` 先统一接入该入口
- `@supramark/rn` 与 `@supramark/web` 先改成消费统一接口

### 第二阶段：迁移剩余 diagram family

- `dot` / `graphviz`
- `vega`
- `vega-lite`
- `echarts`
- `plantuml`

迁移完成标准是：

- engine 内可直接输出 SVG
- renderer 不再直接调用对应图表库
- 平台差异只体现在 SVG 的展示层

### 第三阶段：删除过渡层

- 删除旧 worker / DOM 扫描 / 脚本注入型 diagram 渲染路径

## 验收标准

满足以下条件时，可以认为 diagram 架构收敛完成：

1. 所有 diagram family 都能通过 `@supramark/engines.render()` 返回 SVG。
2. `@supramark/rn` 不依赖额外图表执行容器。
3. `@supramark/web` 不依赖额外图表执行容器。
4. React Native 与 Web 的 diagram 渲染入口一致，只保留展示层差异。
5. SSR、CSR、RN 示例都走同一条 `diagram-engine -> svg -> renderer display` 链路。

## 非目标

以下内容不属于本目标本身：

- 统一所有图表库的 DSL 语法
- 让不同引擎输出完全一致的视觉风格
- 保留浏览器专属的复杂交互能力

本目标只解决一件事：

把 diagram 渲染链统一收口到 `@supramark/engines`，并让各平台 renderer 只消费 SVG 输出。
