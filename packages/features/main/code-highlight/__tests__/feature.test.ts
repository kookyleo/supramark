import { describe, expect, it } from 'bun:test';
import { codeHighlightFeature } from '../src/feature';

describe('codeHighlightFeature', () => {
  it('declares the code highlight runtime compile hint', () => {
    expect(codeHighlightFeature.metadata.id).toBe('@supramark/feature-code-highlight');
    expect(codeHighlightFeature.compile?.codeHighlight?.runtime).toBe(true);
  });
});
