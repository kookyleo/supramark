import type { ExampleDefinition } from '@supramark/core';

export const codeHighlightPresetDevExamples: ExampleDefinition[] = [
  {
    name: 'Dev preset',
    description: 'Highlights common engineering snippets.',
    markdown: ['```rust', 'fn main() { println!("hi"); }', '```'].join('\n'),
  },
];
