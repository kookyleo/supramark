import type { ExampleDefinition } from '@supramark/core';

/**
 * PlantUML Feature 使用示例
 *
 * 每个示例都尽量简短，方便在 preview 应用里快速渲染。Examples 覆盖常见的
 * UML 图族：时序图 / 类图 / 活动图。
 */
export const plantumlExamples: ExampleDefinition[] = [
  {
    name: '时序图示例',
    description: '使用 ```plantuml 围栏定义一个最小的时序图。',
    markdown: `
# PlantUML sequence diagram

\`\`\`plantuml
@startuml
Bob -> Alice : hello
Alice -> Bob : hi
@enduml
\`\`\`
    `.trim(),
  },
  {
    name: '类图示例',
    description: '展示 PlantUML 类图语法。',
    markdown: `
# PlantUML class diagram

\`\`\`plantuml
@startuml
class Animal {
  +name: String
  +eat(): void
}
class Dog extends Animal {
  +bark(): void
}
@enduml
\`\`\`
    `.trim(),
  },
  {
    name: '活动图示例',
    description: '展示 PlantUML 活动图语法。',
    markdown: `
# PlantUML activity diagram

\`\`\`plantuml
@startuml
start
:Read input;
if (valid?) then (yes)
  :Process;
else (no)
  :Reject;
endif
stop
@enduml
\`\`\`
    `.trim(),
  },
];
