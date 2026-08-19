import { landingImage } from '@/lib/landingImage';
import type {
  CollageStripId,
  CollageStripRecord,
  HomepageCollageObjectKey,
  PricingCollageManifest,
} from '@/components/landing/pricing-collage/collageManifest';

const HOMEPAGE_COLLAGE_KEY = /^homepage-collage\/.+\.webp$/;

interface ResolvedCollageStrip {
  readonly id: CollageStripId;
  readonly url: string;
}

type ResolvedPricingCollage = readonly [
  ResolvedCollageStrip,
  ResolvedCollageStrip,
  ResolvedCollageStrip,
  ResolvedCollageStrip,
];

function assertHomepageCollageKey(objectKey: string): asserts objectKey is HomepageCollageObjectKey {
  if (!HOMEPAGE_COLLAGE_KEY.test(objectKey)) {
    throw new Error(`Collage object key must be homepage-collage/*.webp, received ${objectKey}`);
  }
}

function assertPositiveDuration(durationMs: number, id: CollageStripId): void {
  if (!(durationMs > 0) || !Number.isFinite(durationMs)) {
    throw new Error(`Collage duration must be a positive number of milliseconds for ${id}, received ${durationMs}`);
  }
}

function resolveStrip(strip: CollageStripRecord): ResolvedCollageStrip {
  assertPositiveDuration(strip.durationMs, strip.id);
  assertHomepageCollageKey(strip.objectKey);

  return {
    id: strip.id,
    url: landingImage(strip.objectKey),
  };
}

export function resolvePricingCollage(manifest: PricingCollageManifest): ResolvedPricingCollage {
  return [
    resolveStrip(manifest[0]),
    resolveStrip(manifest[1]),
    resolveStrip(manifest[2]),
    resolveStrip(manifest[3]),
  ];
}
