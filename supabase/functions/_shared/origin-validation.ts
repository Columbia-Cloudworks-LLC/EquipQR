/**
 * Origin Validation Utility
 *
 * Validates the Origin header from incoming requests against a known allowlist
 * of trusted origins. Used by Stripe-related Edge Functions (create-checkout,
 * customer-portal, purchase-user-licenses) to build safe redirect URLs, and
 * by getCorsHeaders() for CORS responses.
 *
 * Prevents an attacker from supplying a malicious Origin header that would
 * cause Stripe to redirect the user to a phishing site after checkout.
 */

/**
 * Static allowlist of trusted origins.
 *
 * Production and preview custom domains are listed explicitly.
 * Local dev servers are included for development convenience.
 */
const ALLOWED_ORIGINS = [
  "https://equipqr.app",
  "https://preview.equipqr.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

/**
 * Matches Vercel preview deployment URLs scoped to this project.
 *
 * Vercel generates preview URLs in these forms:
 *   - <project>-<hash>-<team>.vercel.app
 *   - <project>-<team>.vercel.app
 *
 * We anchor to the "equip-qr" project slug so only deployments from
 * this Vercel project are accepted — not arbitrary third-party Vercel sites.
 *
 * The env var VERCEL_PROJECT_SLUG lets operators override the slug without a
 * code change (e.g. if the Vercel project is renamed).
 */
function getVercelPreviewPattern(): RegExp {
  const slug = Deno.env.get("VERCEL_PROJECT_SLUG") || "equip-qr";
  // Escape any regex-special characters in the slug
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^https://${escaped}-.+\\.vercel\\.app$`);
}

/**
 * Returns true when `origin` is in the static allowlist **or** matches the
 * project-scoped Vercel preview pattern.
 */
export function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  return getVercelPreviewPattern().test(origin);
}

/** The default production origin used as a safe fallback. */
export const PRODUCTION_ORIGIN = "https://equipqr.app";

/**
 * Returns the request's Origin header if it matches an allowed origin,
 * otherwise falls back to the PRODUCTION_URL env var or the production domain.
 */
export function getValidatedOrigin(req: Request): string {
  const origin = req.headers.get("origin");

  if (origin && isAllowedOrigin(origin)) {
    return origin;
  }

  return Deno.env.get("PRODUCTION_URL") || PRODUCTION_ORIGIN;
}
