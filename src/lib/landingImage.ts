const LANDING_PAGE_IMAGES_BUCKET_PATH = '/storage/v1/object/public/landing-page-images';

/**
 * Returns the full public URL for an image in the `landing-page-images`
 * Supabase storage bucket. Uses the build-time `VITE_SUPABASE_URL` so the
 * URL automatically tracks whichever Supabase URL the build is configured
 * with — no hardcoded hostname that would break if the Supabase custom
 * domain is ever changed, removed, or unavailable.
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}${LANDING_PAGE_IMAGES_BUCKET_PATH}/${filename}`;
}
