import { describe, expect, it } from 'vitest';
import { resolvePricingCollage } from '@/components/landing/pricing-collage/resolvePricingCollage';
import type { HomepageCollageObjectKey, PositiveMillis, PricingCollageManifest } from '@/components/landing/pricing-collage/collageManifest';

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
  it('is the landingImage boundary and maps durationMs onto animation classes', () => {
    const resolved = resolvePricingCollage(manifest());

    expect(resolved).toHaveLength(4);
    expect(resolved[0]).toEqual({
      id: 'col0',
      url: '/images/landing/homepage-collage/col-0.webp',
      durationClass: 'pricing-collage-duration-48000',
    });
    expect(resolved[1].durationClass).toBe('pricing-collage-duration-56000');
    expect(resolved[2].url).toBe('/images/landing/homepage-collage/col-2.webp');
    expect(resolved[3].durationClass).toBe('pricing-collage-duration-64000');
  });

  it('changes the animation class when durationMs changes', () => {
    const resolved = resolvePricingCollage(manifest([{ durationMs: 64_000 as PositiveMillis }]));

    expect(resolved[0].durationClass).toBe('pricing-collage-duration-64000');
  });

  it('rejects a non-positive duration at the boundary', () => {
    expect(() => resolvePricingCollage(manifest([{ durationMs: 0 as PositiveMillis }]))).toThrow(
      /duration/i,
    );
  });

  it('rejects a duration that has no CSS animation class', () => {
    expect(() => resolvePricingCollage(manifest([{ durationMs: 50_000 as PositiveMillis }]))).toThrow(
      /50000/,
    );
  });

  it('rejects an object key outside homepage-collage/*.webp', () => {
    expect(() =>
      resolvePricingCollage(manifest([{ objectKey: 'hero.webp' as HomepageCollageObjectKey }])),
    ).toThrow(/homepage-collage/i);
  });
});
