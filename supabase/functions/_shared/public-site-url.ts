/**
 * Canonical public app origin for Edge Function redirects and invite links.
 *
 * Prefer PUBLIC_SITE_URL per environment. PRODUCTION_URL remains a legacy
 * fallback for existing deployed secrets until they are migrated.
 */

export const DEFAULT_PUBLIC_SITE_URL = "https://equipqr.app";

export function resolvePublicSiteUrl(): string {
  const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL")?.trim();
  if (publicSiteUrl) {
    return publicSiteUrl;
  }

  const legacyProductionUrl = Deno.env.get("PRODUCTION_URL")?.trim();
  if (legacyProductionUrl) {
    return legacyProductionUrl;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}
