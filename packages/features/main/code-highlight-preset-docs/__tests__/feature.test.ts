import { describe, expect, it } from 'bun:test';
import { codeHighlightPresetDocsFeature } from '../src/feature';

describe('codeHighlightPresetDocsFeature', () => {
  it('declares docs-oriented language and theme assets', () => {
    const highlight = codeHighlightPresetDocsFeature.compile?.codeHighlight;
    expect(codeHighlightPresetDocsFeature.dependencies).toContain(
      '@supramark/feature-code-highlight'
    );
    expect(highlight?.languages).toContain('TypeScript');
    expect(highlight?.languageAliases?.ts).toBe('TypeScript');
    expect(highlight?.themes).toEqual(['GitHub', 'Nord']);
  });
});
