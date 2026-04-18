# Diagram Engine 架构目标

## 背景

当前仓库中的图表渲染仍处于过渡态：

- React Native 侧仍保留 `@supramark/rn-diagram-worker`
- Web 侧仍保留 `@supramark/web-diagram`
- 部分图表已经开始转入本地 `lib -> svg` 渲染
- 部分图表仍依赖隐藏 WebView 或浏览器端脚本注入

这会导致同一个 diagram family 在不同平台上走不同链路，职责分散，后续维护成本高。

## 目标

本次架构收敛的目标只有两条。

### A. 所有 diagram family 的生成过程都进入 `@supramark/diagram-engine`

所有 diagram family 都应该统一由 `@supramark/diagram-engine` 负责把源代码转换为 SVG 输出。

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

- `Math / LaTeX` 虽然不属于 `diagram` AST family，但也建议沿用同样的 `engine-first` 路线，即由 `@supramark/diagram-engine` 产出 SVG，再由各平台展示。

### B. 所有 diagram 的消费，无论 RN 还是 Web，都只从 `@supramark/diagram-engine` 获取 SVG

`@supramark/rn` 和 `@supramark/web` 的职责应该收敛为“消费 SVG 输出”，而不是各自直接运行图表库。

也就是说：

- `@supramark/rn`
  - 输入：AST 节点
  - 调用：`@supramark/diagram-engine`
  - 输出：React Native 组件树与 SVG 展示
- `@supramark/web`
  - 输入：AST 节点
  - 调用：`@supramark/diagram-engine`
  - 输出：React DOM / SSR HTML 与 SVG 展示

Renderer 侧不再负责：

- 自己引 Mermaid / Vega / ECharts 等渲染库
- 自己拼接脚本并扫描 DOM
- 自己维护 WebView/worker 型图表执行环境

## 目标结构

目标分层如下：

```text
@supramark/core
  └─ 负责 AST、parser、feature 配置

@supramark/diagram-engine
  └─ 负责 diagram source -> svg

@supramark/rn
  └─ 负责 AST -> 组件 + 展示 SVG

@supramark/web
  └─ 负责 AST -> React/HTML + 展示 SVG
```

在这个结构下：

- `@supramark/diagram-engine` 是唯一 diagram 渲染入口
- `@supramark/rn-diagram-worker` 最终应删除
- `@supramark/web-diagram` 最终应删除

## 过渡原则

在完全迁移完成前，允许存在过渡方案，但必须遵守以下原则：

1. 新增 diagram 能力时，不再扩散到新的 renderer 私有实现。
2. 任何已完成本地 `lib -> svg` 的 family，都优先迁入 `@supramark/diagram-engine`。
3. `@supramark/rn` 与 `@supramark/web` 即使暂时保留 fallback，也应优先通过 `@supramark/diagram-engine.render()` 获取结果。
4. `rn-diagram-worker` 与 `web-diagram` 只作为未迁移 family 的临时兼容层，不再作为长期架构继续扩展。

## 迁移顺序

建议按以下顺序推进。

### 第一阶段：统一入口

- 为 `@supramark/diagram-engine` 建立统一 `render()` / `createDiagramEngine()` 入口
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

- 删除 `@supramark/rn-diagram-worker`
- 删除 `@supramark/web-diagram`
- 删除依赖 WebView / DOM 扫描 / 脚本注入的 diagram 渲染路径

## 验收标准

满足以下条件时，可以认为 diagram 架构收敛完成：

1. 所有 diagram family 都能通过 `@supramark/diagram-engine.render()` 返回 SVG。
2. `@supramark/rn` 不再依赖 `@supramark/rn-diagram-worker`。
3. `@supramark/web` 不再依赖 `@supramark/web-diagram`。
4. React Native 与 Web 的 diagram 渲染入口一致，只保留展示层差异。
5. SSR、CSR、RN 示例都走同一条 `diagram-engine -> svg -> renderer display` 链路。

## 非目标

以下内容不属于本目标本身：

- 统一所有图表库的 DSL 语法
- 让不同引擎输出完全一致的视觉风格
- 保留浏览器专属的复杂交互能力

本目标只解决一件事：

把 diagram 渲染链统一收口到 `@supramark/diagram-engine`，并让各平台 renderer 只消费 SVG 输出。
