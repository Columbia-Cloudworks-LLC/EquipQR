const PRODUCTION_LANDING_VIDEOS_ORIGIN =
  'https://supabase.equipqr.app/storage/v1/object/public/landing-page-videos';

// Demos stay on production storage so a local Force reset does not empty them.
export function landingVideo(filename: string): string {
  const normalized = filename.replaceAll('\\', '/').replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error(`landingVideo(): parent-directory segments are not allowed (${filename})`);
  }

  if (normalized === 'pr-evidence' || normalized.startsWith('pr-evidence/')) {
    throw new Error(`landingVideo(): pr-evidence/ is not a marketing demo (${filename})`);
  }

  return `${PRODUCTION_LANDING_VIDEOS_ORIGIN}/${normalized}`;
}
