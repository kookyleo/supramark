import type {
  SupramarkNode,
  SupramarkDiagramNode,
  FeatureConfigWithOptions,
  SupramarkConfig,
  SupramarkFeature,
} from '@supramark/core';
import { FeatureRegistry, getFeatureOptionsAs } from '@supramark/core';
import { plantumlExamples } from './examples.js';

/**
 * PlantUML 图表 Feature
 *
 * - 复用通用 `diagram` AST 节点；
 * - 只关心 engine 为 'plantuml' 的 diagram；
 * - 由 `@supramark/engines` 借助 `@kookyleo/plantuml-little-web`（Rust wasm）
 *   在 Web 端将 `@startuml ... @enduml` 源码转换为 SVG。
 *
 * @example
 * ```markdown
 * ```plantuml
 * @startuml
 * Bob -> Alice : hello
 * @enduml
 * ```
 * ```
 */

const isPlantumlDiagram = (node: SupramarkNode): node is SupramarkDiagramNode => {
  return (
    node.type === 'diagram' &&
    typeof (node as SupramarkDiagramNode).engine === 'string' &&
    (node as SupramarkDiagramNode).engine.toLowerCase() === 'plantuml'
  );
};

export const plantumlFeature: SupramarkFeature<SupramarkDiagramNode> = {
  metadata: {
    id: '@supramark/feature-plantuml',
    name: 'Diagram (PlantUML)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'PlantUML UML diagrams rendered to SVG through @supramark/engines + plantuml-little-web.',
    license: 'Apache-2.0',
    tags: ['diagram', 'plantuml', 'uml'],
    syntaxFamily: 'fence',
  },

  syntax: {
    ast: {
      type: 'diagram',
      selector: isPlantumlDiagram,
      interface: {
        required: ['type', 'engine', 'code'],
        optional: ['meta'],
        fields: {
          type: {
            type: 'string',
            description: 'Node type identifier, always "diagram".',
          },
          engine: {
            type: 'string',
            description: 'Diagram engine identifier, fixed as "plantuml" for this feature.',
          },
          code: {
            type: 'string',
            description: 'Raw PlantUML source text (between ```plantuml fences, typically wrapped with @startuml / @enduml).',
          },
          meta: {
            type: 'object',
            description: 'Optional runtime metadata for PlantUML rendering (e.g. skin params).',
          },
        },
      },
      examples: [
        {
          type: 'diagram',
          engine: 'plantuml',
          code: '@startuml\nBob -> Alice : hello\n@enduml',
        } as SupramarkDiagramNode,
      ],
    },
  },

  renderers: {
    rn: {
      platform: 'rn',
      infrastructure: {
        needsWorker: false,
        needsCache: true,
      },
      dependencies: [
        {
          name: 'react-native-svg',
          version: '^13.0.0',
          type: 'npm',
          optional: false,
        },
      ],
    },
    web: {
      platform: 'web',
      infrastructure: {
        needsClientScript: true,
        clientScriptBuilder: () =>
          '<!-- PlantUML rendering provided by @supramark/engines (plantuml-little-web wasm). -->',
      },
      dependencies: [
        {
          name: '@kookyleo/plantuml-little-web',
          version: '>=1.2026.2-3',
          type: 'npm',
          optional: false,
        },
      ],
    },
  },

  examples: plantumlExamples,

  testing: {
    syntaxTests: {
      cases: [
        {
          name: '解析 plantuml 围栏为 diagram 节点',
          input: ['```plantuml', '@startuml', 'Bob -> Alice : hello', '@enduml', '```'].join('\n'),
          expected: {
            type: 'diagram',
            engine: 'plantuml',
          } as unknown as SupramarkDiagramNode,
          options: {
            typeOnly: true,
          },
        },
      ],
    },
    renderTests: {
      web: [
        {
          name: 'Web 渲染 PlantUML diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'plantuml',
            code: '@startuml\nBob -> Alice : hello\n@enduml',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
      rn: [
        {
          name: 'RN 渲染 PlantUML diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'plantuml',
            code: '@startuml\nBob -> Alice : hello\n@enduml',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
    },
    integrationTests: {
      cases: [
        {
          name: '端到端：markdown 中包含 ```plantuml 围栏',
          input: [
            '# PlantUML demo',
            '',
            '```plantuml',
            '@startuml',
            'Bob -> Alice : hello',
            '@enduml',
            '```',
          ].join('\n'),
          validate: (result: unknown) => {
            if (!result || typeof result !== 'object') return false;
            const root = result as any;
            const children = Array.isArray(root.children) ? root.children : [];
            return children.some(
              (n: any) => n.type === 'diagram' && String(n.engine).toLowerCase() === 'plantuml'
            );
          },
          platforms: ['web', 'rn'],
        },
      ],
    },
    coverageRequirements: {
      statements: 50,
      branches: 40,
      functions: 40,
      lines: 50,
    },
  },

  documentation: {
    readme: `
# Diagram (PlantUML) Feature

为 supramark 提供 PlantUML 围栏代码块的 AST 建模，并在 Web 端通过
\`@kookyleo/plantuml-little-web\`（Rust wasm）渲染为 SVG。

- 语法：使用 \`\\\`\\\`plantuml\` 围栏；
- AST：解析为 \`diagram\` 节点，engine = "plantuml"，code 为 PlantUML 源码；
- 渲染：由 \`@supramark/engines\` 在 Web 侧调用 plantuml-little-web 输出 SVG。
    `.trim(),

    api: {
      interfaces: [
        {
          name: 'PlantumlFeatureOptions',
          description: 'PlantUML Feature 的配置选项（当前为空，预留扩展）。',
          fields: [],
        },
      ],
      functions: [
        {
          name: 'createPlantumlFeatureConfig',
          description: '创建 PlantUML Feature 的配置对象。',
          parameters: [
            {
              name: 'enabled',
              type: 'boolean',
              description: '是否启用该 Feature',
              optional: false,
            },
            {
              name: 'options',
              type: 'PlantumlFeatureOptions',
              description: '可选配置项',
              optional: true,
            },
          ],
          returns: 'PlantumlFeatureConfig',
        },
        {
          name: 'getPlantumlFeatureOptions',
          description: '从 SupramarkConfig 中读取 PlantUML Feature 的 options。',
          parameters: [
            {
              name: 'config',
              type: 'SupramarkConfig | undefined',
              description: '全局 supramark 配置',
              optional: true,
            },
          ],
          returns: 'PlantumlFeatureOptions | undefined',
        },
      ],
      types: [],
    },

    bestPractices: [
      '使用 @startuml / @enduml 包裹 PlantUML 源码，保持跨渲染器兼容；',
      '针对大图建议通过 diagram 统一配置启用缓存，避免重复 wasm 调用。',
    ],

    faq: [
      {
        question: 'PlantUML 是如何渲染的？',
        answer:
          'Web 端通过 @kookyleo/plantuml-little-web（Rust → wasm）把 PlantUML 源码转为 SVG；Graphviz 布局通过 @kookyleo/graphviz-anywhere-web 桥接。',
      },
      {
        question: '为什么需要 Graphviz 桥？',
        answer:
          'plantuml-little-web 的图族（组件图、用例图等）依赖 Graphviz 做布局，因此默认 loader 会先 fetch graphviz-anywhere-web，再把结果回传给 plantuml-little-web 的 `convert()` 入口。',
      },
    ],
  },
};

FeatureRegistry.register(plantumlFeature);

export interface PlantumlFeatureOptions {
  // 预留：未来可加入 skin params / 默认主题等
}

export type PlantumlFeatureConfig = FeatureConfigWithOptions<PlantumlFeatureOptions>;

export function createPlantumlFeatureConfig(
  enabled: boolean,
  options?: PlantumlFeatureOptions
): PlantumlFeatureConfig {
  return {
    id: '@supramark/feature-plantuml',
    enabled,
    options,
  };
}

export function getPlantumlFeatureOptions(
  config?: SupramarkConfig
): PlantumlFeatureOptions | undefined {
  return getFeatureOptionsAs<PlantumlFeatureOptions>(config, '@supramark/feature-plantuml');
}
