export type SitePath = `/${string}`;

export const LANDING_IMAGE_KEYS = [
  'homepage-collage/col-0.webp',
  'homepage-collage/col-1.webp',
  'homepage-collage/col-2.webp',
  'homepage-collage/col-3.webp',
  'teams-list-2026-04.png',
  'team-detail-2026-04.png',
  'fleet-map-2026-04.png',
  'pm-templates-list-2026-04.png',
  'pm-templates-detail-2026-04.png',
  'quickbooks-settings-2026-04.png',
  'work-order-detail-2026-04.png',
  'work-orders-list-2026-04.png',
  'equipment-qr-code-modal-2026-04.png',
  'equipment-list-2026-04.png',
  'google-workspace-settings-2026-04.png',
  'mobile-work-orders-2026-04.png',
  'mobile-work-order-detail-2026-04.png',
  'mobile-pm-checklist-2026-04.png',
  'inventory-list-2026-04.png',
  'inventory-item-detail-2026-04.png',
  'part-lookup-2026-04.png',
] as const;

type LandingImageKey = (typeof LANDING_IMAGE_KEYS)[number];

const LANDING_IMAGE_KEY_SET: ReadonlySet<string> = new Set(LANDING_IMAGE_KEYS);

function normalizeLandingImageFilename(filename: string): string {
  return filename.replaceAll('\\', '/').replace(/^\/+/, '');
}

// Same-origin git catalog so a local Force reset does not empty marketing stills.
export function landingImage(filename: string): SitePath {
  const key = normalizeLandingImageFilename(filename);

  if (key.includes('..')) {
    throw new Error(`landingImage(): parent-directory segments are not allowed (${filename})`);
  }

  if (key === 'pr-evidence' || key.startsWith('pr-evidence/')) {
    throw new Error(`landingImage(): pr-evidence/ is not a marketing still (${filename})`);
  }

  if (!LANDING_IMAGE_KEY_SET.has(key)) {
    throw new Error(`landingImage(): unknown landing image key ${key}`);
  }

  const catalogKey = key as LandingImageKey;
  return `/images/landing/${catalogKey}`;
}
