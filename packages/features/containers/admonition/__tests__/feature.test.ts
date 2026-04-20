import { admonitionFeature, ADMONITION_CONTAINER_NAMES } from '../src/feature';
import { validateContainerFeature } from '@supramark/core';

describe('Admonition Feature', () => {
  describe('ContainerFeature shape', () => {
    it('should have valid container feature definition', () => {
      const result = validateContainerFeature(admonitionFeature);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct id', () => {
      expect(admonitionFeature.id).toBe('@supramark/feature-admonition');
    });

    it('should have semantic version', () => {
      expect(admonitionFeature.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should expose all admonition container names', () => {
      expect(admonitionFeature.containerNames).toEqual([...ADMONITION_CONTAINER_NAMES]);
    });

    it('should provide parser registration and renderer exports', () => {
      expect(typeof admonitionFeature.registerParser).toBe('function');
      expect(admonitionFeature.webRendererExport).toBe('renderAdmonitionContainerWeb');
      expect(admonitionFeature.rnRendererExport).toBe('renderAdmonitionContainerRN');
    });
  });
});
