import type {
  SupramarkNode,
  SupramarkDiagramNode,
  FeatureConfigWithOptions,
  SupramarkConfig,
  SupramarkFeature,
} from '@supramark/core';
import { FeatureRegistry, getFeatureOptionsAs } from '@supramark/core';
import { d2Examples } from './examples.js';

/**
 * D2 图表 Feature
 *
 * - 复用通用 `diagram` AST 节点；
 * - 只关心 engine 为 'd2' 的 diagram；
 * - 由 `@supramark/engines` 借助 `@kookyleo/d2-little-web`（Rust wasm，纯 Rust
 *   布局引擎，无需外部 Graphviz 桥）在 Web 端将 D2 源码转换为 SVG。
 *
 * @example
 * ```markdown
 * ```d2
 * a -> b
 * ```
 * ```
 */

const isD2Diagram = (node: SupramarkNode): node is SupramarkDiagramNode => {
  return (
    node.type === 'diagram' &&
    typeof (node as SupramarkDiagramNode).engine === 'string' &&
    (node as SupramarkDiagramNode).engine.toLowerCase() === 'd2'
  );
};

export const d2Feature: SupramarkFeature<SupramarkDiagramNode> = {
  metadata: {
    id: '@supramark/feature-d2',
    name: 'Diagram (D2)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'D2 diagrams rendered to SVG through @supramark/engines + d2-little-web.',
    license: 'Apache-2.0',
    tags: ['diagram', 'd2'],
    syntaxFamily: 'fence',
  },

  syntax: {
    ast: {
      type: 'diagram',
      selector: isD2Diagram,
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
            description: 'Diagram engine identifier, fixed as "d2" for this feature.',
          },
          code: {
            type: 'string',
            description: 'Raw D2 source text (between ```d2 fences).',
          },
          meta: {
            type: 'object',
            description: 'Optional runtime metadata for D2 rendering (e.g. theme, sketch).',
          },
        },
      },
      examples: [
        {
          type: 'diagram',
          engine: 'd2',
          code: 'a -> b',
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
          '<!-- D2 rendering provided by @supramark/engines (d2-little-web wasm). -->',
      },
      dependencies: [
        {
          name: '@kookyleo/d2-little-web',
          version: '>=0.7.1',
          type: 'npm',
          optional: false,
        },
      ],
    },
  },

  examples: d2Examples,

  testing: {
    syntaxTests: {
      cases: [
        {
          name: '解析 d2 围栏为 diagram 节点',
          input: ['```d2', 'a -> b', '```'].join('\n'),
          expected: {
            type: 'diagram',
            engine: 'd2',
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
          name: 'Web 渲染 D2 diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'd2',
            code: 'a -> b',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
      rn: [
        {
          name: 'RN 渲染 D2 diagram（占位验证输出存在）',
          input: {
            type: 'diagram',
            engine: 'd2',
            code: 'a -> b',
          } as SupramarkDiagramNode,
          expected: (output: unknown) => output !== null && output !== undefined,
          snapshot: false,
        },
      ],
    },
    integrationTests: {
      cases: [
        {
          name: '端到端：markdown 中包含 ```d2 围栏',
          input: [
            '# D2 demo',
            '',
            '```d2',
            'a -> b',
            '```',
          ].join('\n'),
          validate: (result: unknown) => {
            if (!result || typeof result !== 'object') return false;
            const root = result as any;
            const children = Array.isArray(root.children) ? root.children : [];
            return children.some(
              (n: any) => n.type === 'diagram' && String(n.engine).toLowerCase() === 'd2'
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
# Diagram (D2) Feature

为 supramark 提供 D2 围栏代码块的 AST 建模，并在 Web 端通过
\`@kookyleo/d2-little-web\`（Rust wasm）渲染为 SVG。

- 语法：使用 \`\\\`\\\`d2\` 围栏；
- AST：解析为 \`diagram\` 节点，engine = "d2"，code 为 D2 源码；
- 渲染：由 \`@supramark/engines\` 在 Web 侧调用 d2-little-web 输出 SVG。
    `.trim(),

    api: {
      interfaces: [
        {
          name: 'D2FeatureOptions',
          description: 'D2 Feature 的配置选项（当前为空，预留扩展）。',
          fields: [],
        },
      ],
      functions: [
        {
          name: 'createD2FeatureConfig',
          description: '创建 D2 Feature 的配置对象。',
          parameters: [
            {
              name: 'enabled',
              type: 'boolean',
              description: '是否启用该 Feature',
              optional: false,
            },
            {
              name: 'options',
              type: 'D2FeatureOptions',
              description: '可选配置项',
              optional: true,
            },
          ],
          returns: 'D2FeatureConfig',
        },
        {
          name: 'getD2FeatureOptions',
          description: '从 SupramarkConfig 中读取 D2 Feature 的 options。',
          parameters: [
            {
              name: 'config',
              type: 'SupramarkConfig | undefined',
              description: '全局 supramark 配置',
              optional: true,
            },
          ],
          returns: 'D2FeatureOptions | undefined',
        },
      ],
      types: [],
    },

    bestPractices: [
      '保持 D2 源码简洁，复杂图建议分模块使用容器 `{}` 组织；',
      '建议通过 diagram 统一配置启用缓存，避免重复 wasm 调用。',
    ],

    faq: [
      {
        question: 'D2 是如何渲染的？',
        answer:
          'Web 端通过 @kookyleo/d2-little-web（Rust → wasm）把 D2 源码转为 SVG。d2-little 自带纯 Rust 布局引擎，不需要像 PlantUML 那样外挂 Graphviz 桥。',
      },
      {
        question: 'D2 和 mermaid / plantuml 的区别？',
        answer:
          'D2 是一种更现代的声明式图表 DSL，强调容器、样式与现代布局。它与 mermaid / plantuml 互补：mermaid 侧重流程 / 时序，plantuml 覆盖完整 UML，D2 适合软件架构 / 系统图。',
      },
    ],
  },
};

FeatureRegistry.register(d2Feature);

export interface D2FeatureOptions {
  // 预留：未来可加入 theme / sketch 等
}

export type D2FeatureConfig = FeatureConfigWithOptions<D2FeatureOptions>;

export function createD2FeatureConfig(
  enabled: boolean,
  options?: D2FeatureOptions
): D2FeatureConfig {
  return {
    id: '@supramark/feature-d2',
    enabled,
    options,
  };
}

export function getD2FeatureOptions(
  config?: SupramarkConfig
): D2FeatureOptions | undefined {
  return getFeatureOptionsAs<D2FeatureOptions>(config, '@supramark/feature-d2');
}
