import { describe, expect, it } from 'bun:test';
import { codeHighlightPresetFullFeature } from '../src/feature';

describe('codeHighlightPresetFullFeature', () => {
  it('requests the full two_face syntax and theme sets', () => {
    const highlight = codeHighlightPresetFullFeature.compile?.codeHighlight;
    expect(codeHighlightPresetFullFeature.dependencies).toContain(
      '@supramark/feature-code-highlight'
    );
    expect(highlight?.languages).toEqual(['*']);
    expect(highlight?.themes).toEqual(['*']);
  });
});
