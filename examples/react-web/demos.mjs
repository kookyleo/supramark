/**
 * 仅供 react-web 示例使用的 demo 聚合入口。
 *
 * 放在包目录内，避免跨出 workspace 包后丢失本地依赖解析上下文。
 */

import { mathExamples } from '../../packages/features/feature-math/src/examples.ts';
import { gfmExamples } from '../../packages/features/feature-gfm/src/examples.ts';
import { admonitionExamples } from '../../packages/features/feature-admonition/src/examples.ts';
import { definitionListExamples } from '../../packages/features/feature-definition-list/src/examples.ts';
import { emojiExamples } from '../../packages/features/feature-emoji/src/examples.ts';
import { footnoteExamples } from '../../packages/features/feature-footnote/src/examples.ts';
import { coreMarkdownExamples } from '../../packages/features/feature-core-markdown/src/examples.ts';
import { htmlPageExamples } from '../../packages/features/container/feature-html-page/src/examples.ts';
import { mapExamples } from '../../packages/features/container/feature-map/src/examples.ts';

export const DEMOS = [
  ...coreMarkdownExamples.map((ex, idx) => ({ ...ex, id: `core-${idx}` })),
  ...mathExamples.map(ex => ({ ...ex, id: 'math' })),
  ...gfmExamples.map(ex => ({ ...ex, id: 'gfm' })),
  ...admonitionExamples.map(ex => ({ ...ex, id: 'admonition' })),
  ...definitionListExamples.map(ex => ({ ...ex, id: 'definition-list' })),
  ...emojiExamples.map(ex => ({ ...ex, id: 'emoji' })),
  ...footnoteExamples.map(ex => ({ ...ex, id: 'footnote' })),
  ...htmlPageExamples.map(ex => ({ ...ex, id: 'html-page' })),
  ...mapExamples.map(ex => ({ ...ex, id: 'map' })),
];
