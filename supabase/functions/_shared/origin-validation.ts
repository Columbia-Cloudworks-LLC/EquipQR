/**
 * Origin Validation Utility
 *
 * Validates the Origin header from incoming requests against a known allowlist
 * of trusted origins. Used by Stripe-related Edge Functions (create-checkout,
 * customer-portal, purchase-user-licenses) to build safe redirect URLs.
 *
 * Prevents an attacker from supplying a malicious Origin header that would
 * cause Stripe to redirect the user to a phishing site after checkout.
 */

const ALLOWED_ORIGINS = [
  "https://equipqr.app",
  "https://preview.equipqr.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

/**
 * Returns the request's Origin header if it matches an allowed origin,
 * otherwise falls back to the PRODUCTION_URL env var or the production domain.
 */
export function getValidatedOrigin(req: Request): string {
  const origin = req.headers.get("origin");

  if (
    origin &&
    (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app"))
  ) {
    return origin;
  }

  return Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
}
