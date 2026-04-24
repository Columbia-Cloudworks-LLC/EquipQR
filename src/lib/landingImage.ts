const LANDING_PAGE_IMAGES_BUCKET_PATH = '/storage/v1/object/public/landing-page-images';

/**
 * Returns the full public URL for an image in the `landing-page-images`
 * Supabase storage bucket. Uses the build-time `VITE_SUPABASE_URL` so the
 * URL automatically tracks whichever Supabase URL the build is configured
 * with — no hardcoded hostname that would break if the Supabase custom
 * domain is ever changed, removed, or unavailable.
 *
 * Fails fast with a descriptive error when `VITE_SUPABASE_URL` is missing
 * or empty (matching the pattern in `src/integrations/supabase/client.ts`),
 * and normalizes trailing/leading slashes on both the base URL and the
 * filename so a misconfigured base URL like `https://host/` does not yield
 * a broken `https://host//storage/...` URL.
 *
 * Related: GitHub issue #677 captures the original incident that prompted
 * this helper (silent Cloudflare custom-hostname cert renewal failure +
 * ISP DNS interception of *.equipqr.app subdomains).
 *
 * @example
 * landingImage('work-orders-list.png');
 * // => 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/work-orders-list.png'
 */
export function landingImage(filename: string): string {
  const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!rawSupabaseUrl || typeof rawSupabaseUrl !== 'string' || rawSupabaseUrl.trim() === '') {
    throw new Error(
      'landingImage(): missing required env VITE_SUPABASE_URL. Set it in your .env file or build environment.'
    );
  }

  const supabaseUrl = rawSupabaseUrl.trim().replace(/\/+$/, '');
  const normalizedFilename = filename.replace(/^\/+/, '');

  return `${supabaseUrl}${LANDING_PAGE_IMAGES_BUCKET_PATH}/${normalizedFilename}`;
}
