import type { ExampleDefinition } from '@supramark/core';

export const codeHighlightPresetFullExamples: ExampleDefinition[] = [
  {
    name: 'Full preset',
    description: 'Requests the full two_face language and theme assets.',
    markdown: ['```zig', 'const std = @import("std");', '```'].join('\n'),
  },
];
