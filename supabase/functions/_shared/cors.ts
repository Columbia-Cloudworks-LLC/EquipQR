import { isAllowedOrigin, PRODUCTION_ORIGIN } from "./origin-validation.ts";

/**
 * Returns CORS headers with the `Access-Control-Allow-Origin` set to the
 * request's Origin header (if it is in the allowlist) or to the production
 * domain.  Prefer this over the static `corsHeaders` export.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : PRODUCTION_ORIGIN,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/** Origin-validated fallback when a Request is not available. Never wildcard. */
export function getFallbackCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": PRODUCTION_ORIGIN,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Static CORS headers with a production origin (not wildcard).
 * @deprecated Prefer `getCorsHeaders(req)` for origin-validated responses.
 */
export const corsHeaders = getFallbackCorsHeaders();
