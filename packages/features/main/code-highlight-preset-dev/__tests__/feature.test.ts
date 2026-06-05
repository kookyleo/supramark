import { describe, expect, it } from 'bun:test';
import { codeHighlightPresetDevFeature } from '../src/feature';

describe('codeHighlightPresetDevFeature', () => {
  it('declares developer language assets', () => {
    const highlight = codeHighlightPresetDevFeature.compile?.codeHighlight;
    expect(codeHighlightPresetDevFeature.dependencies).toContain(
      '@supramark/feature-code-highlight'
    );
    expect(highlight?.languages).toContain('Rust');
    expect(highlight?.languages).toContain('Python');
    expect(highlight?.languageAliases?.rs).toBe('Rust');
  });
});
