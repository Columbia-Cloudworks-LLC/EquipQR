const PUBLIC_SUPABASE_ORIGIN = 'https://supabase.equipqr.app';

/**
 * Public API origin for marketing demos and other same-project Storage.
 * Reads `VITE_SUPABASE_URL` when it is already the production host; otherwise
 * pins to that host so a local Force reset (empty Storage) cannot blank videos.
 */
export function resolvePublicSupabaseOrigin(
  configuredUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL,
): string {
  const trimmed = typeof configuredUrl === 'string' ? configuredUrl.trim() : '';

  try {
    const parsed = new URL(trimmed);
    return parsed.origin === PUBLIC_SUPABASE_ORIGIN
      ? parsed.origin
      : PUBLIC_SUPABASE_ORIGIN;
  } catch {
    return PUBLIC_SUPABASE_ORIGIN;
  }
}
