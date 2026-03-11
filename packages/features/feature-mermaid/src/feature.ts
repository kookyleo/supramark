import type {
  SupramarkNode,
  SupramarkDiagramNode,
  FeatureConfigWithOptions,
  SupramarkConfig,
  SupramarkFeature,
} from '@supramark/core';
import { FeatureRegistry, getFeatureOptionsAs } from '@supramark/core';
import { mermaidExamples } from './examples.js';

const isMermaidDiagram = (node: SupramarkNode): node is SupramarkDiagramNode => {
  return (
    node.type === 'diagram' &&
    typeof (node as SupramarkDiagramNode).engine === 'string' &&
    (node as SupramarkDiagramNode).engine.toLowerCase() === 'mermaid'
  );
};

export const mermaidFeature: SupramarkFeature<SupramarkDiagramNode> = {
  metadata: {
    id: '@supramark/feature-mermaid',
    name: 'Diagram (Mermaid)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'Support for Mermaid diagrams rendered via the unified diagram pipeline.',
    license: 'Apache-2.0',
    tags: ['diagram', 'mermaid'],
    syntaxFamily: 'fence',
  },

  syntax: {
    ast: {
      type: 'diagram',
      selector: isMermaidDiagram,
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
            description: 'Diagram engine identifier, fixed as "mermaid" for this feature.',
          },
          code: {
            type: 'string',
            description: 'Raw Mermaid source text (between ```mermaid fences).',
          },
          meta: {
            type: 'object',
            description: 'Optional runtime metadata for Mermaid rendering.',
          },
        },
      },
      examples: [
        {
          type: 'diagram',
          engine: 'mermaid',
          code: 'graph TD\n  A --> B',
        } as SupramarkDiagramNode,
      ],
    },
  },

  renderers: {
    rn: {
      platform: 'rn',
      infrastructure: {
        needsWorker: true,
        needsCache: true,
        workerType: 'webview',
      },
    },
    web: {
      platform: 'web',
      infrastructure: {
        needsClientScript: true,
        clientScriptBuilder: () =>
          '<!-- Mermaid integration provided by @supramark/web-diagram (Mermaid → SVG). -->',
      },
    },
  },

  examples: mermaidExamples,

  testing: {
    syntaxTests: {
      cases: [
        {
          name: '解析 mermaid 围栏为 diagram 节点',
          input: ['```mermaid', 'graph TD', '  A --> B', '```'].join('\n'),
          expected: {
            type: 'diagram',
            engine: 'mermaid',
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
          name: 'Web 渲染 Mermaid diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'mermaid',
            code: 'graph TD\n  A --> B',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
      rn: [
        {
          name: 'RN 渲染 Mermaid diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'mermaid',
            code: 'graph TD\n  A --> B',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
    },
    integrationTests: {
      cases: [
        {
          name: '端到端：markdown 中包含 ```mermaid 围栏',
          input: ['# Mermaid demo', '', '```mermaid', 'graph TD', '  A --> B', '```'].join('\n'),
          validate: (result: unknown) => {
            if (!result || typeof result !== 'object') return false;
            const root = result as any;
            const children = Array.isArray(root.children) ? root.children : [];
            return children.some(
              (n: any) => n.type === 'diagram' && String(n.engine).toLowerCase() === 'mermaid'
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
# Mermaid Feature

为 supramark 提供基于 Mermaid 的图表示例支持。

- 语法：使用 \`\\\`\\\`mermaid\` 围栏代码块；
- AST：解析为 \`diagram\` 节点，engine = "mermaid"；
- 渲染：通过统一图表子系统生成 SVG。
    `.trim(),

    api: {
      interfaces: [
        {
          name: 'MermaidFeatureOptions',
          description: 'Mermaid Feature 的配置选项（当前为空，预留扩展）。',
          fields: [],
        },
      ],
      functions: [
        {
          name: 'createMermaidFeatureConfig',
          description: '创建 Mermaid Feature 的配置对象。',
          parameters: [
            {
              name: 'enabled',
              type: 'boolean',
              description: '是否启用该 Feature',
              optional: false,
            },
            {
              name: 'options',
              type: 'MermaidFeatureOptions',
              description: '可选配置项',
              optional: true,
            },
          ],
          returns: 'MermaidFeatureConfig',
        },
        {
          name: 'getMermaidFeatureOptions',
          description: '从 SupramarkConfig 中读取 Mermaid Feature 的 options。',
          parameters: [
            {
              name: 'config',
              type: 'SupramarkConfig | undefined',
              description: '全局 supramark 配置',
              optional: true,
            },
          ],
          returns: 'MermaidFeatureOptions | undefined',
        },
      ],
      types: [],
    },

    bestPractices: [
      '将 Mermaid 代码保持在最小可复用片段，便于在 Web 与 RN 端共享。',
      '与其把布局参数塞进 markdown，不如优先使用统一 diagram 配置来控制超时与缓存。',
    ],

    faq: [
      {
        question: '为什么 Mermaid 现在也需要独立 Feature 包？',
        answer:
          '因为 parser / renderer / feature gating 需要对齐。独立 Feature 包能把 Mermaid 纳入同一套能力发现、配置与文档体系。',
      },
    ],
  },
};

FeatureRegistry.register(mermaidFeature);

export interface MermaidFeatureOptions {
  // reserved for future options
}

export type MermaidFeatureConfig = FeatureConfigWithOptions<MermaidFeatureOptions>;

export function createMermaidFeatureConfig(
  enabled: boolean,
  options?: MermaidFeatureOptions
): MermaidFeatureConfig {
  return {
    id: '@supramark/feature-mermaid',
    enabled,
    options,
  };
}

export function getMermaidFeatureOptions(
  config?: SupramarkConfig
): MermaidFeatureOptions | undefined {
  return getFeatureOptionsAs<MermaidFeatureOptions>(config, '@supramark/feature-mermaid');
}
