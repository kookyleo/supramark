import { mermaidFeature } from '../src/feature.js';

describe('Mermaid Feature', () => {
  it('has valid metadata id', () => {
    expect(mermaidFeature.metadata.id).toBe('@supramark/feature-mermaid');
  });

  it('uses diagram ast type', () => {
    expect(mermaidFeature.syntax.ast.type).toBe('diagram');
  });
});
