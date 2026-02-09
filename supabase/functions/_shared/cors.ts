/**
 * Known-safe origins for CORS.
 * Requests from unknown origins fall back to the production domain.
 */
const ALLOWED_CORS_ORIGINS = [
  "https://equipqr.app",
  "https://preview.equipqr.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

/**
 * Returns CORS headers with the `Access-Control-Allow-Origin` set to the
 * request's Origin header (if it is in the allowlist) or to the production
 * domain.  Prefer this over the static `corsHeaders` export.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed =
    ALLOWED_CORS_ORIGINS.includes(origin) || origin.endsWith(".vercel.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_CORS_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Static CORS headers with wildcard origin.
 * @deprecated Prefer `getCorsHeaders(req)` for origin-validated responses.
 * Kept for backward compatibility during incremental migration.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
