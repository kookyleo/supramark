import { weatherFeature, WEATHER_CONTAINER_NAMES } from '../src/feature';
import { validateContainerFeature } from '@supramark/core';

describe('Weather Feature', () => {
  describe('ContainerFeature shape', () => {
    it('should have valid container feature definition', () => {
      const result = validateContainerFeature(weatherFeature);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have correct id', () => {
      expect(weatherFeature.id).toBe('@supramark/feature-weather');
    });

    it('should have semantic version', () => {
      expect(weatherFeature.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should expose the weather container name', () => {
      expect(weatherFeature.containerNames).toEqual([...WEATHER_CONTAINER_NAMES]);
    });

    it('should provide parser registration and renderer exports', () => {
      expect(typeof weatherFeature.registerParser).toBe('function');
      expect(weatherFeature.webRendererExport).toBe('renderWeatherContainerWeb');
      expect(weatherFeature.rnRendererExport).toBe('renderWeatherContainerRN');
    });
  });
});
