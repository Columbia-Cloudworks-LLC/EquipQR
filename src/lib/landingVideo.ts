import { resolvePublicSupabaseOrigin } from '@/lib/publicSupabaseOrigin';

const LANDING_PAGE_VIDEOS_BUCKET = '/storage/v1/object/public/landing-page-videos';

function landingVideosOrigin(): string {
  return `${resolvePublicSupabaseOrigin()}${LANDING_PAGE_VIDEOS_BUCKET}`;
}

// Demos stay on production storage so a local Force reset does not empty them.
export function landingVideo(filename: string): string {
  const normalized = filename.replaceAll('\\', '/').replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error(`landingVideo(): parent-directory segments are not allowed (${filename})`);
  }

  if (normalized === 'pr-evidence' || normalized.startsWith('pr-evidence/')) {
    throw new Error(`landingVideo(): pr-evidence/ is not a marketing demo (${filename})`);
  }

  return `${landingVideosOrigin()}/${normalized}`;
}
