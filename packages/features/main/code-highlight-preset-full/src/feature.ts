import type { FeatureConfigWithOptions, SupramarkFeature, SupramarkNode } from '@supramark/core';
import { FeatureRegistry, makeFeatureConfigHelpers } from '@supramark/core';
import { codeHighlightPresetFullExamples } from './examples.js';

export interface CodeHighlightPresetFullFeatureOptions {
  // Compile-time preset; no runtime options.
}

export type CodeHighlightPresetFullFeatureConfig =
  FeatureConfigWithOptions<CodeHighlightPresetFullFeatureOptions>;

export const codeHighlightPresetFullFeature: SupramarkFeature<SupramarkNode> = {
  metadata: {
    id: '@supramark/feature-code-highlight-preset-full',
    name: 'Code Highlight Preset (Full)',
    version: '0.1.0',
    author: 'Supramark Team',
    description: 'Compile-time highlight asset preset for the full two_face syntax/theme set.',
    license: 'Apache-2.0',
    tags: ['code', 'highlight', 'preset', 'full'],
    syntaxFamily: 'fence',
  },
  dependencies: ['@supramark/feature-code-highlight'],
  syntax: {
    ast: {
      type: 'code-highlight-preset-full',
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
      languages: ['*'],
      themes: ['*'],
      defaultThemes: { light: 'GitHub', dark: 'Nord' },
    },
  },
  examples: codeHighlightPresetFullExamples,
  testing: { syntaxTests: { cases: [] } },
  documentation: {
    readme: '# Code Highlight Full Preset\n\nCompile-time asset preset for full two_face coverage.',
    api: {
      interfaces: [
        {
          name: 'CodeHighlightPresetFullFeatureOptions',
          description: 'Compile-time preset marker options.',
          fields: [],
        },
      ],
    },
  },
};

FeatureRegistry.register(codeHighlightPresetFullFeature);

const helpers = makeFeatureConfigHelpers<CodeHighlightPresetFullFeatureOptions>(
  '@supramark/feature-code-highlight-preset-full'
);
export const createCodeHighlightPresetFullFeatureConfig = helpers.create;
export const getCodeHighlightPresetFullFeatureOptions = helpers.getOptions;
