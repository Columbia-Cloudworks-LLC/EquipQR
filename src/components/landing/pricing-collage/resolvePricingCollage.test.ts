import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePricingCollage } from '@/components/landing/pricing-collage/resolvePricingCollage';
import type { HomepageCollageObjectKey, PositiveMillis, PricingCollageManifest } from '@/components/landing/pricing-collage/collageManifest';

const SUPABASE_URL = 'https://custom-supabase.example.test';

function strip(
  id: PricingCollageManifest[number]['id'],
  objectKey: string,
  durationMs: number,
): PricingCollageManifest[number] {
  return {
    id,
    objectKey: objectKey as HomepageCollageObjectKey,
    durationMs: durationMs as PositiveMillis,
  };
}

function manifest(
  overrides: Partial<PricingCollageManifest[number]>[] = [],
): PricingCollageManifest {
  const base: PricingCollageManifest = [
    strip('col0', 'homepage-collage/col-0.webp', 48_000),
    strip('col1', 'homepage-collage/col-1.webp', 56_000),
    strip('col2', 'homepage-collage/col-2.webp', 52_000),
    strip('col3', 'homepage-collage/col-3.webp', 64_000),
  ];
  return base.map((row, index) => ({ ...row, ...overrides[index] })) as unknown as PricingCollageManifest;
}

describe('resolvePricingCollage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is the landingImage boundary and returns urls for each strip', () => {
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);

    const resolved = resolvePricingCollage(manifest());

    expect(resolved).toHaveLength(4);
    expect(resolved[0]).toEqual({
      id: 'col0',
      url: `${SUPABASE_URL}/storage/v1/object/public/landing-page-images/homepage-collage/col-0.webp`,
    });
    expect(resolved[1].id).toBe('col1');
    expect(resolved[2].url).toContain('homepage-collage/col-2.webp');
    expect(resolved[3].id).toBe('col3');
  });

  it('rejects a non-positive duration at the boundary', () => {
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);

    expect(() => resolvePricingCollage(manifest([{ durationMs: 0 as PositiveMillis }]))).toThrow(
      /duration/i,
    );
  });

  it('rejects an object key outside homepage-collage/*.webp', () => {
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);

    expect(() =>
      resolvePricingCollage(manifest([{ objectKey: 'hero.webp' as HomepageCollageObjectKey }])),
    ).toThrow(/homepage-collage/i);
  });
});
