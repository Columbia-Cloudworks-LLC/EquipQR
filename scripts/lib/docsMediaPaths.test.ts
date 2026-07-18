import { describe, expect, it } from 'vitest';
import {
  buildDocsMediaMarkdownImage,
  buildDocsMediaMarkdownVideo,
  buildDocsMediaPublicUrl,
  buildDocsMediaStoragePath,
  sanitizeDocsMediaLabel,
} from './docsMediaPaths.mjs';

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

describe('buildDocsMediaPublicUrl', () => {
  it('builds anonymous public URLs for docs-media objects', () => {
    expect(
      buildDocsMediaPublicUrl(
        'https://supabase.equipqr.app',
        'support/location-maps/desktop/01-equipment-location-source.png',
      ),
    ).toBe(
      'https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/01-equipment-location-source.png',
    );
  });
});

describe('buildDocsMediaMarkdownImage', () => {
  it('emits markdown image syntax for docs articles', () => {
    expect(
      buildDocsMediaMarkdownImage({
        alt: 'Equipment location source dropdown',
        publicUrl:
          'https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/01-equipment-location-source.png',
      }),
    ).toBe(
      '![Equipment location source dropdown](https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/01-equipment-location-source.png)',
    );
  });
});

describe('buildDocsMediaMarkdownVideo', () => {
  it('emits a bare public URL line for inline video playback', () => {
    expect(
      buildDocsMediaMarkdownVideo({
        publicUrl:
          'https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/demo.mp4',
      }),
    ).toBe(
      'https://supabase.equipqr.app/storage/v1/object/public/docs-media/support/location-maps/desktop/demo.mp4',
    );
  });
});
