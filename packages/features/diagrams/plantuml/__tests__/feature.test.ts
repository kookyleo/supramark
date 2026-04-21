import { plantumlFeature } from '../src/feature.js';

describe('PlantUML Feature', () => {
  it('has valid metadata id', () => {
    expect(plantumlFeature.metadata.id).toBe('@supramark/feature-plantuml');
  });

  it('uses diagram ast type', () => {
    expect(plantumlFeature.syntax.ast.type).toBe('diagram');
  });

  it('declares fence syntax family', () => {
    expect(plantumlFeature.metadata.syntaxFamily).toBe('fence');
  });
});
