/**
 * Service-role bearer authorization for cron-invoked Edge Functions.
 *
 * pg_cron helpers (public.invoke_queue_worker, invoke_quickbooks_token_refresh,
 * invoke_quickbooks_invoice_status_sync) send `Bearer <vault service_role_key>`.
 * Requiring that token to be byte-equal to this runtime's
 * SUPABASE_SERVICE_ROLE_KEY made every run fail whenever the vault copy and the
 * platform-injected key drifted apart (different issuance of the same role),
 * even though the gateway had already verified the JWT.
 *
 * Accepted tokens:
 *   1. An exact match of `expectedKey` (any key format), or
 *   2. A JWT whose payload has `role: "service_role"` and is not expired.
 *
 * SECURITY: path 2 does NOT verify the signature. It is only safe for functions
 * deployed with `verify_jwt = true` in supabase/config.toml, where the platform
 * gateway rejects unsigned/forged JWTs before the function runs. Never use this
 * helper in a `verify_jwt = false` function. `service-role-auth.deno.test.ts`
 * enforces the config for every current caller.
 */

export type ServiceRoleAuthResult =
  | { ok: true; method: "exact-key" | "service-role-jwt" }
  | { ok: false; reason: ServiceRoleAuthFailure };

export type ServiceRoleAuthFailure =
  | "missing-authorization"
  | "invalid-scheme"
  | "empty-token"
  | "not-a-jwt"
  | "malformed-jwt"
  | "not-service-role"
  | "expired";

function extractBearerToken(
  req: Request,
): { token: string } | { reason: ServiceRoleAuthFailure } {
  const header = req.headers.get("Authorization");
  if (!header) return { reason: "missing-authorization" };

  const parts = header.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "bearer") return { reason: "invalid-scheme" };
  if (parts.length !== 2 || !parts[1]) return { reason: "empty-token" };

  return { token: parts[1] };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed: unknown = JSON.parse(atob(padded));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function authorizeServiceRoleRequest(
  req: Request,
  expectedKey: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): ServiceRoleAuthResult {
  const extracted = extractBearerToken(req);
  if ("reason" in extracted) return { ok: false, reason: extracted.reason };
  const { token } = extracted;

  if (expectedKey && token === expectedKey) {
    return { ok: true, method: "exact-key" };
  }

  if (token.split(".").length !== 3) return { ok: false, reason: "not-a-jwt" };

  const payload = decodeJwtPayload(token);
  if (!payload) return { ok: false, reason: "malformed-jwt" };
  if (payload.role !== "service_role") return { ok: false, reason: "not-service-role" };
  if (typeof payload.exp === "number" && payload.exp <= nowSeconds) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, method: "service-role-jwt" };
}
