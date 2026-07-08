/**
 * Helpers for detecting and describing Google Maps API-key authorization
 * failures (`RefererNotAllowedMapError` and its downstream crashes).
 */

export const MAPS_REFERRER_RUNBOOK_URL =
  'https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/main/docs/ops/supabase-branch-secrets.md#google-maps-api-key--http-referrer-allowlist';

export interface MapsAuthFailure {
  /** Full page URL (origin + pathname) — matches Google's own console error. */
  currentUrl: string;
  /** Wildcard referrer pattern to paste into the API key allowlist. */
  allowlistEntry: string;
}

/** Builds the failure payload for the current browser location. */
export function buildMapsAuthFailureFromLocation(): MapsAuthFailure {
  return {
    currentUrl: `${window.location.origin}${window.location.pathname}`,
    allowlistEntry: `${window.location.origin}/*`,
  };
}

/**
 * Google Maps half-initializes before rejecting an unauthorized key, then its
 * internal marker/map code crashes with opaque TypeErrors (e.g. `Cannot read
 * properties of undefined (reading 'keys')` from `main.js`, or `(reading
 * 'get')` from `marker.js`). Recognize those so error boundaries can render
 * the referrer-allowlist diagnostic instead of a generic crash card.
 */
export function isLikelyMapsAuthCrash(error: Error | undefined): boolean {
  if (!error) return false;
  const message = error.message ?? '';
  const stack = error.stack ?? '';
  const isOpaqueMapsTypeError =
    /Cannot read properties of undefined \(reading '(keys|get)'\)/.test(message);
  // Anchor on the full Maps JS bundle origin in the stack trace, not a bare
  // substring, so lookalike hosts cannot satisfy the check.
  const isFromMapsBundle = /https:\/\/maps\.googleapis\.com\//.test(stack);
  return isOpaqueMapsTypeError && isFromMapsBundle;
}
