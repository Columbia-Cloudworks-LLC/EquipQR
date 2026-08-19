export type HomepageCollageObjectKey = `homepage-collage/${string}.webp`;
export type PositiveMillis = number & { readonly __brand: 'PositiveMillis' };
export type CollageStripId = 'col0' | 'col1' | 'col2' | 'col3';

export interface CollageStripRecord {
  readonly id: CollageStripId;
  readonly objectKey: HomepageCollageObjectKey;
  readonly durationMs: PositiveMillis;
}

export type PricingCollageManifest = readonly [
  CollageStripRecord,
  CollageStripRecord,
  CollageStripRecord,
  CollageStripRecord,
];

function asPositiveMillis(value: number): PositiveMillis {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(`Collage duration must be a positive number of milliseconds, received ${value}`);
  }
  return value as PositiveMillis;
}

export const PRICING_COLLAGE_MANIFEST: PricingCollageManifest = [
  { id: 'col0', objectKey: 'homepage-collage/col-0.webp', durationMs: asPositiveMillis(48_000) },
  { id: 'col1', objectKey: 'homepage-collage/col-1.webp', durationMs: asPositiveMillis(56_000) },
  { id: 'col2', objectKey: 'homepage-collage/col-2.webp', durationMs: asPositiveMillis(52_000) },
  { id: 'col3', objectKey: 'homepage-collage/col-3.webp', durationMs: asPositiveMillis(64_000) },
];
