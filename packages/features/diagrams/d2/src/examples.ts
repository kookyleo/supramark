import type { ExampleDefinition } from '@supramark/core';

/**
 * D2 Feature 使用示例
 *
 * 每个示例都尽量简短，方便在 preview 应用里快速渲染。示例覆盖：
 *  - 最简连线（a -> b）
 *  - 带标签的连线
 *  - 容器 / 分组（customers: { ... }）
 *
 * 语法参考：https://d2lang.com/
 */
export const d2Examples: ExampleDefinition[] = [
  {
    name: '最简流程',
    description: '使用 ```d2 围栏定义一条最小的节点连线。',
    markdown: `
# D2 minimal flow

\`\`\`d2
a -> b
\`\`\`
    `.trim(),
  },
  {
    name: '带标签连线',
    description: '展示 D2 连线标签语法。',
    markdown: `
# D2 labeled edges

\`\`\`d2
user -> database: reads
database -> user: rows
\`\`\`
    `.trim(),
  },
  {
    name: '容器 / 分组',
    description: '展示 D2 的容器（container）语法，把多个节点组织为一个子图。',
    markdown: `
# D2 container

\`\`\`d2
customers: {
  alice
  bob
}
\`\`\`
    `.trim(),
  },
];
