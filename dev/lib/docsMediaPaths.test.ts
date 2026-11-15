import { describe, expect, it } from 'vitest';
import { buildDocsMediaStoragePath, sanitizeDocsMediaLabel } from './docsMediaPaths.mjs';

describe('sanitizeDocsMediaLabel', () => {
  it('normalizes screenshot labels for stable storage paths', () => {
    expect(sanitizeDocsMediaLabel('01 Equipment Location Source')).toBe(
      '01-equipment-location-source',
    );
    expect(sanitizeDocsMediaLabel('')).toBe('screenshot');
  });
});

describe('buildDocsMediaStoragePath', () => {
  it('maps desktop screenshots to stable public docs-media paths', () => {
    expect(
      buildDocsMediaStoragePath({
        collection: 'location-maps',
        variant: 'desktop',
        label: '01-equipment-location-source',
        extension: 'png',
      }),
    ).toBe('support/location-maps/desktop/01-equipment-location-source.png');
  });

  it('maps mobile screenshots and videos to stable public docs-media paths', () => {
    expect(
      buildDocsMediaStoragePath({
        collection: 'location-maps',
        variant: 'mobile',
        label: '01-equipment-location-source',
        extension: 'png',
      }),
    ).toBe('support/location-maps/mobile/01-equipment-location-source.png');

    expect(
      buildDocsMediaStoragePath({
        collection: 'location-maps',
        variant: 'mobile',
        label: 'demo',
        extension: 'mp4',
      }),
    ).toBe('support/location-maps/mobile/demo.mp4');
  });
});
