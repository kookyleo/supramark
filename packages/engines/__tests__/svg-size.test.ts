import { describe, expect, it } from 'bun:test';
import { computeDiagramBox, parseSvgSize } from '../src/svg-size';

describe('parseSvgSize', () => {
  it('prefers viewBox', () => {
    const svg = '<svg viewBox="0 0 800 400" width="10" height="10"><g/></svg>';
    expect(parseSvgSize(svg)).toEqual({ width: 800, height: 400, aspectRatio: 2 });
  });

  it('supports comma-separated viewBox', () => {
    expect(parseSvgSize('<svg viewBox="0,0,100,50"></svg>')).toEqual({
      width: 100,
      height: 50,
      aspectRatio: 2,
    });
  });

  it('falls back to width/height attributes when no viewBox', () => {
    expect(parseSvgSize('<svg width="300" height="150"></svg>')).toEqual({
      width: 300,
      height: 150,
      aspectRatio: 2,
    });
  });

  it('strips absolute units (pt/px) on width/height fallback', () => {
    expect(parseSvgSize('<svg width="120pt" height="60pt"></svg>')).toEqual({
      width: 120,
      height: 60,
      aspectRatio: 2,
    });
  });

  it('ignores relative-unit dimensions (%, em) as non-intrinsic', () => {
    expect(parseSvgSize('<svg width="100%" height="100%"></svg>')).toBeNull();
  });

  it('returns null when neither viewBox nor usable dimensions exist', () => {
    expect(parseSvgSize('<svg><g/></svg>')).toBeNull();
  });

  it('returns null for non-svg input', () => {
    expect(parseSvgSize('<div>nope</div>')).toBeNull();
  });

  it('rejects zero / negative dimensions', () => {
    expect(parseSvgSize('<svg viewBox="0 0 0 100"></svg>')).toBeNull();
  });
});

describe('computeDiagramBox', () => {
  it('fits container width and derives height from aspect ratio', () => {
    const size = { width: 800, height: 400, aspectRatio: 2 };
    expect(computeDiagramBox({ size, containerWidth: 600 })).toEqual({ width: 600, height: 300 });
  });

  it('clamps tall diagrams to maxHeight', () => {
    const size = { width: 100, height: 2000, aspectRatio: 0.05 };
    expect(computeDiagramBox({ size, containerWidth: 360, maxHeight: 500 })).toEqual({
      width: 360,
      height: 500,
    });
  });

  it('falls back to fallbackHeight when size is null', () => {
    expect(computeDiagramBox({ size: null, containerWidth: 400 })).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('honors a custom fallbackHeight', () => {
    expect(computeDiagramBox({ size: null, containerWidth: 400, fallbackHeight: 200 })).toEqual({
      width: 400,
      height: 200,
    });
  });
});
