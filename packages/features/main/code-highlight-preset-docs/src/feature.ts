import type { FeatureConfigWithOptions, SupramarkFeature, SupramarkNode } from '@supramark/core';
import { FeatureRegistry, makeFeatureConfigHelpers } from '@supramark/core';
import { codeHighlightPresetDocsExamples } from './examples.js';

export interface CodeHighlightPresetDocsFeatureOptions {
  // Compile-time preset; no runtime options.
}

export type CodeHighlightPresetDocsFeatureConfig =
  FeatureConfigWithOptions<CodeHighlightPresetDocsFeatureOptions>;

const DOC_LANGUAGES = [
  'Markdown',
  'MultiMarkdown',
  'JSON',
  'YAML',
  'TOML',
  'Bash',
  'Dockerfile',
  'Diff',
  'TypeScript',
  'TypescriptReact',
  'JavaScript',
  'JSX',
  'CSS',
  'HTML',
  'XML',
] as const;

const DOC_ALIASES = {
  md: 'Markdown',
  markdown: 'Markdown',
  mdx: 'Markdown',
  json: 'JSON',
  jsonc: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  bash: 'Bash',
  sh: 'Bash',
  shell: 'Bash',
  zsh: 'Bash',
  dockerfile: 'Dockerfile',
  diff: 'Diff',
  patch: 'Diff',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TypescriptReact',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
} as const;

export const codeHighlightPresetDocsFeature: SupramarkFeature<SupramarkNode> = {
  metadata: {
    id: '@supramark/feature-code-highlight-preset-docs',
    name: 'Code Highlight Preset (Docs)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'Compile-time highlight asset preset for documentation and config snippets.',
    license: 'Apache-2.0',
    tags: ['code', 'highlight', 'preset', 'docs'],
    syntaxFamily: 'fence',
  },
  dependencies: ['@supramark/feature-code-highlight'],
  syntax: {
    ast: {
      type: 'code-highlight-preset-docs',
      selector: () => false,
      constraints: {
        allowedParents: [],
        allowedChildren: [],
      },
      examples: [],
    },
  },
  renderers: {
    web: {
      platform: 'web',
      infrastructure: { needsClientScript: false, needsWorker: false, needsCache: false },
      dependencies: [],
    },
    rn: {
      platform: 'rn',
      infrastructure: { needsWorker: false, needsCache: false },
      dependencies: [],
    },
  },
  compile: {
    codeHighlight: {
      languages: [...DOC_LANGUAGES],
      languageAliases: { ...DOC_ALIASES },
      themes: ['GitHub', 'Nord'],
      defaultThemes: {
        light: 'GitHub',
        dark: 'Nord',
      },
    },
  },
  examples: codeHighlightPresetDocsExamples,
  testing: { syntaxTests: { cases: [] } },
  documentation: {
    readme: '# Code Highlight Docs Preset\n\nCompile-time asset preset for documentation snippets.',
    api: {
      interfaces: [
        {
          name: 'CodeHighlightPresetDocsFeatureOptions',
          description: 'Compile-time preset marker options.',
          fields: [],
        },
      ],
    },
  },
};

FeatureRegistry.register(codeHighlightPresetDocsFeature);

const helpers = makeFeatureConfigHelpers<CodeHighlightPresetDocsFeatureOptions>(
  '@supramark/feature-code-highlight-preset-docs'
);
export const createCodeHighlightPresetDocsFeatureConfig = helpers.create;
export const getCodeHighlightPresetDocsFeatureOptions = helpers.getOptions;
