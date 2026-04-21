import { d2Feature } from '../src/feature.js';

describe('D2 Feature', () => {
  it('has valid metadata id', () => {
    expect(d2Feature.metadata.id).toBe('@supramark/feature-d2');
  });

  it('uses diagram ast type', () => {
    expect(d2Feature.syntax.ast.type).toBe('diagram');
  });

  it('declares fence syntax family', () => {
    expect(d2Feature.metadata.syntaxFamily).toBe('fence');
  });
});
