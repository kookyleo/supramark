import type { FeatureConfigWithOptions, SupramarkFeature, SupramarkNode } from '@supramark/core';
import { FeatureRegistry, makeFeatureConfigHelpers } from '@supramark/core';
import { codeHighlightPresetDevExamples } from './examples.js';

export interface CodeHighlightPresetDevFeatureOptions {
  // Compile-time preset; no runtime options.
}

export type CodeHighlightPresetDevFeatureConfig =
  FeatureConfigWithOptions<CodeHighlightPresetDevFeatureOptions>;

const DEV_LANGUAGES = [
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
  'SCSS',
  'HTML',
  'XML',
  'Rust',
  'Python',
  'Go',
  'Java',
  'Kotlin',
  'Swift',
  'C',
  'C++',
  'C#',
  'SQL',
  'GraphQL',
  'Lua',
  'PHP',
  'Ruby',
  'Dart',
  'Terraform',
  'Nix',
] as const;

const DEV_ALIASES = {
  md: 'Markdown',
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
  scss: 'SCSS',
  html: 'HTML',
  xml: 'XML',
  rs: 'Rust',
  rust: 'Rust',
  py: 'Python',
  python: 'Python',
  go: 'Go',
  java: 'Java',
  kt: 'Kotlin',
  kotlin: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  cxx: 'C++',
  cc: 'C++',
  cs: 'C#',
  csharp: 'C#',
  sql: 'SQL',
  graphql: 'GraphQL',
  gql: 'GraphQL',
  lua: 'Lua',
  php: 'PHP',
  rb: 'Ruby',
  ruby: 'Ruby',
  dart: 'Dart',
  tf: 'Terraform',
  terraform: 'Terraform',
  nix: 'Nix',
} as const;

export const codeHighlightPresetDevFeature: SupramarkFeature<SupramarkNode> = {
  metadata: {
    id: '@supramark/feature-code-highlight-preset-dev',
    name: 'Code Highlight Preset (Dev)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'Compile-time highlight asset preset for developer-facing Markdown.',
    license: 'Apache-2.0',
    tags: ['code', 'highlight', 'preset', 'dev'],
    syntaxFamily: 'fence',
  },
  dependencies: ['@supramark/feature-code-highlight'],
  syntax: {
    ast: {
      type: 'code-highlight-preset-dev',
      selector: () => false,
      constraints: { allowedParents: [], allowedChildren: [] },
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
      languages: [...DEV_LANGUAGES],
      languageAliases: { ...DEV_ALIASES },
      themes: ['GitHub', 'Nord', 'OneHalfDark', 'OneHalfLight'],
      defaultThemes: { light: 'GitHub', dark: 'Nord' },
    },
  },
  examples: codeHighlightPresetDevExamples,
  testing: { syntaxTests: { cases: [] } },
  documentation: {
    readme: '# Code Highlight Dev Preset\n\nCompile-time asset preset for developer snippets.',
    api: {
      interfaces: [
        {
          name: 'CodeHighlightPresetDevFeatureOptions',
          description: 'Compile-time preset marker options.',
          fields: [],
        },
      ],
    },
  },
};

FeatureRegistry.register(codeHighlightPresetDevFeature);

const helpers = makeFeatureConfigHelpers<CodeHighlightPresetDevFeatureOptions>(
  '@supramark/feature-code-highlight-preset-dev'
);
export const createCodeHighlightPresetDevFeatureConfig = helpers.create;
export const getCodeHighlightPresetDevFeatureOptions = helpers.getOptions;
