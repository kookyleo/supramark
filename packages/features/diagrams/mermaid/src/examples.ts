import type { ExampleDefinition } from '@supramark/core';

/**
 * Mermaid Feature 使用示例
 */
export const mermaidExamples: ExampleDefinition[] = [
  {
    name: '流程图示例',
    description: '使用 ```mermaid 围栏代码块定义一个简单流程图。',
    markdown: `
# Mermaid diagram 示例

\`\`\`mermaid
graph TD
  Start([Start]) --> Check{Ready?}
  Check -->|Yes| Ship[Ship]
  Check -->|No| Fix[Fix]
\`\`\`
    `.trim(),
  },
];
