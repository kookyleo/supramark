import type { ExampleDefinition } from '@supramark/core';

export const codeHighlightExamples: ExampleDefinition[] = [
  {
    name: 'TypeScript code fence',
    description: 'A normal code fence that can be highlighted when language assets are compiled.',
    markdown: ['```ts', 'const message: string = "hello";', '```'].join('\n'),
  },
];
