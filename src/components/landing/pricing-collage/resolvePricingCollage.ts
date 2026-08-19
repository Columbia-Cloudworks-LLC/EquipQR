import { landingImage } from '@/lib/landingImage';
import type {
  CollageStripId,
  CollageStripRecord,
  HomepageCollageObjectKey,
  PricingCollageManifest,
  PositiveMillis,
} from '@/components/landing/pricing-collage/collageManifest';

const HOMEPAGE_COLLAGE_KEY = /^homepage-collage\/.+\.webp$/;

const DURATION_CLASS_BY_MS = {
  48_000: 'pricing-collage-duration-48000',
  56_000: 'pricing-collage-duration-56000',
  52_000: 'pricing-collage-duration-52000',
  64_000: 'pricing-collage-duration-64000',
} as const;

type SupportedDurationMs = keyof typeof DURATION_CLASS_BY_MS;

type CollageTrackDurationClass = (typeof DURATION_CLASS_BY_MS)[SupportedDurationMs];

interface ResolvedCollageStrip {
  readonly id: CollageStripId;
  readonly url: string;
  readonly durationClass: CollageTrackDurationClass;
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

function durationClassFor(durationMs: PositiveMillis, id: CollageStripId): CollageTrackDurationClass {
  if (!(durationMs > 0) || !Number.isFinite(durationMs)) {
    throw new Error(`Collage duration must be a positive number of milliseconds for ${id}, received ${durationMs}`);
  }

  const durationClass = DURATION_CLASS_BY_MS[durationMs as SupportedDurationMs];
  if (!durationClass) {
    throw new Error(
      `Collage duration ${durationMs}ms for ${id} has no animation class; supported values are ${Object.keys(DURATION_CLASS_BY_MS).join(', ')}`,
    );
  }

  return durationClass;
}

function resolveStrip(strip: CollageStripRecord): ResolvedCollageStrip {
  const durationClass = durationClassFor(strip.durationMs, strip.id);
  assertHomepageCollageKey(strip.objectKey);

  return {
    id: strip.id,
    url: landingImage(strip.objectKey),
    durationClass,
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
