const LANDING_PAGE_VIDEOS_BUCKET_PATH = '/storage/v1/object/public/landing-page-videos';

/**
 * Returns the full public URL for an asset in the `landing-page-videos`
 * Supabase storage bucket. Mirrors {@link import('./landingImage').landingImage}
 * and serves the bucket that backs marketing demo videos (MP4 + WebM) and
 * their poster frames (JPEG).
 *
 * Uses the build-time `VITE_SUPABASE_URL` so the URL automatically tracks
 * whichever Supabase URL the build is configured with — no hardcoded
 * hostname that would break if the Supabase custom domain is ever changed,
 * removed, or unavailable.
 *
 * Fails fast with a descriptive error when `VITE_SUPABASE_URL` is missing
 * or empty (matching `landingImage` and `src/integrations/supabase/client.ts`),
 * and normalizes trailing/leading slashes on both the base URL and the
 * filename so a misconfigured base URL like `https://host/` does not yield
 * a broken `https://host//storage/...` URL.
 *
 * @example
 * landingVideo('mobile_create_pm.mp4');
 * // => '<VITE_SUPABASE_URL>/storage/v1/object/public/landing-page-videos/mobile_create_pm.mp4'
 */
export function landingVideo(filename: string): string {
  const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!rawSupabaseUrl || typeof rawSupabaseUrl !== 'string' || rawSupabaseUrl.trim() === '') {
    throw new Error(
      'landingVideo(): missing required env VITE_SUPABASE_URL. Set it in your .env file or build environment.'
    );
  }

  const supabaseUrl = rawSupabaseUrl.trim().replace(/\/+$/, '');
  const normalizedFilename = filename.replace(/^\/+/, '');

  return `${supabaseUrl}${LANDING_PAGE_VIDEOS_BUCKET_PATH}/${normalizedFilename}`;
}
