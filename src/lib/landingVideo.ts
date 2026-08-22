const LANDING_PAGE_VIDEOS_BUCKET = '/storage/v1/object/public/landing-page-videos';
const PRODUCTION_SUPABASE_ORIGIN = 'https://supabase.equipqr.app';

function landingVideosOrigin(): string {
  const configured = import.meta.env.VITE_SUPABASE_URL;
  const trimmed =
    typeof configured === 'string' ? configured.trim().replace(/\/+$/, '') : '';

  // Local Force reset empties Storage. Keep demos on the production host.
  const origin = trimmed.includes('supabase.equipqr.app')
    ? trimmed
    : PRODUCTION_SUPABASE_ORIGIN;

  return `${origin}${LANDING_PAGE_VIDEOS_BUCKET}`;
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
