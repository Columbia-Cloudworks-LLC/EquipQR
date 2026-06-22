import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { decryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";
import { disconnectGoogleWorkspaceForOrganization } from "../_shared/google-workspace-disconnect.ts";

export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_RISC_ISSUER = "https://accounts.google.com";
export const RISC_VERIFICATION_EVENT =
  "https://schemas.openid.net/secevent/risc/event-type/verification";

export const RISC_REVOCATION_EVENT_TYPES = new Set([
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
]);

export type SecurityEventTokenPayload = {
  iss: string;
  aud: string | string[];
  iat: number;
  jti: string;
  events: Record<string, Record<string, unknown>>;
};

export type RiscSubjectHint = {
  googleUserId?: string;
  email?: string;
  refreshTokenPrefix?: string;
};

type GoogleJwk = JsonWebKey & { kid?: string };
type GoogleJwksResponse = { keys: GoogleJwk[] };

let cachedJwks: GoogleJwksResponse | null = null;
let cachedJwksFetchedAt = 0;
const JWKS_CACHE_MS = 60 * 60 * 1000;

function base64UrlToUint8Array(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJwtPart<T>(part: string): T {
  const decoded = new TextDecoder().decode(base64UrlToUint8Array(part));
  return JSON.parse(decoded) as T;
}

export function parseSecurityEventToken(token: string): SecurityEventTokenPayload {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid security event token format");
  }

  return decodeJwtPart<SecurityEventTokenPayload>(parts[1]!);
}

async function fetchGoogleJwks(forceRefresh = false): Promise<GoogleJwksResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedJwks && now - cachedJwksFetchedAt < JWKS_CACHE_MS) {
    return cachedJwks;
  }

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${response.status}`);
  }

  cachedJwks = await response.json() as GoogleJwksResponse;
  cachedJwksFetchedAt = now;
  return cachedJwks;
}

async function resolveGoogleSigningJwk(kid: string): Promise<GoogleJwk> {
  let jwks = await fetchGoogleJwks();
  let jwk = jwks.keys.find((key) => key.kid === kid);
  if (!jwk) {
    jwks = await fetchGoogleJwks(true);
    jwk = jwks.keys.find((key) => key.kid === kid);
  }
  if (!jwk) {
    throw new Error("Unable to resolve Google signing key");
  }
  return jwk;
}

function audienceMatches(payloadAud: string | string[], acceptedAudiences: string[]): boolean {
  const audiences = Array.isArray(payloadAud) ? payloadAud : [payloadAud];
  return audiences.some((audience) => acceptedAudiences.includes(audience));
}

export async function verifyGoogleSecurityEventToken(
  token: string,
  acceptedAudiences: string[],
): Promise<SecurityEventTokenPayload> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid security event token format");
  }

  const header = decodeJwtPart<{ alg?: string; kid?: string }>(parts[0]!);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported security event token algorithm");
  }

  const jwk = await resolveGoogleSigningJwk(header.kid);

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signedBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToUint8Array(parts[2]!);
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    new Uint8Array(signature),
    signedBytes,
  );
  if (!verified) {
    throw new Error("Security event token signature verification failed");
  }

  const payload = decodeJwtPart<SecurityEventTokenPayload>(parts[1]!);
  if (payload.iss !== GOOGLE_RISC_ISSUER) {
    throw new Error("Unexpected security event token issuer");
  }

  if (!audienceMatches(payload.aud, acceptedAudiences)) {
    throw new Error("Security event token audience mismatch");
  }

  if (!payload.events || typeof payload.events !== "object") {
    throw new Error("Security event token missing events claim");
  }

  return payload;
}

export function extractSubjectHints(payload: SecurityEventTokenPayload): RiscSubjectHint[] {
  const hints: RiscSubjectHint[] = [];

  for (const [eventType, eventBody] of Object.entries(payload.events)) {
    if (!RISC_REVOCATION_EVENT_TYPES.has(eventType)) {
      continue;
    }

    const subject = eventBody.subject;
    if (!subject || typeof subject !== "object") {
      continue;
    }

    const subjectRecord = subject as Record<string, unknown>;
    const hint: RiscSubjectHint = {};

    if (typeof subjectRecord.sub === "string") {
      hint.googleUserId = subjectRecord.sub;
    }

    if (typeof subjectRecord.email === "string") {
      hint.email = subjectRecord.email;
    }

    if (typeof subjectRecord.token === "string") {
      hint.refreshTokenPrefix = subjectRecord.token;
    }

    if (hint.googleUserId || hint.email || hint.refreshTokenPrefix) {
      hints.push(hint);
    }
  }

  return hints;
}

export function isVerificationOnlyEvent(payload: SecurityEventTokenPayload): boolean {
  const eventTypes = Object.keys(payload.events);
  return eventTypes.length === 1 && eventTypes[0] === RISC_VERIFICATION_EVENT;
}

export function hasSupportedRevocationEvents(payload: SecurityEventTokenPayload): boolean {
  return Object.keys(payload.events).some((eventType) => RISC_REVOCATION_EVENT_TYPES.has(eventType));
}

function emailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return null;
  }
  return email.slice(atIndex + 1).toLowerCase();
}

async function resolveOrganizationsByRefreshTokenPrefix(
  supabaseClient: SupabaseClient,
  prefix: string,
  scopedOrganizationIds: string[],
): Promise<string[]> {
  if (prefix.length < 6 || scopedOrganizationIds.length === 0) {
    return [];
  }

  const encryptionKey = getTokenEncryptionKey();
  const { data, error } = await supabaseClient
    .from("google_workspace_credentials")
    .select("organization_id, refresh_token")
    .in("organization_id", scopedOrganizationIds);

  if (error) {
    throw new Error(`Failed to load Google Workspace credentials: ${error.message}`);
  }

  const organizationIds = new Set<string>();
  for (const row of data ?? []) {
    if (!row.refresh_token || typeof row.organization_id !== "string") {
      continue;
    }

    try {
      const refreshToken = await decryptToken(row.refresh_token, encryptionKey);
      if (refreshToken.startsWith(prefix)) {
        organizationIds.add(row.organization_id);
      }
    } catch {
      // Skip rows that cannot be decrypted; do not log token material.
    }
  }

  return [...organizationIds];
}

async function resolveOrganizationsByGoogleUserId(
  supabaseClient: SupabaseClient,
  googleUserId: string,
): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from("google_workspace_directory_users")
    .select("organization_id")
    .eq("google_user_id", googleUserId);

  if (error) {
    throw new Error(`Failed to resolve directory user organizations: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.organization_id).filter(Boolean))];
}

async function resolveOrganizationsByEmailDomain(
  supabaseClient: SupabaseClient,
  email: string,
): Promise<string[]> {
  const domain = emailDomain(email);
  if (!domain) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("google_workspace_credentials")
    .select("organization_id, domain")
    .ilike("domain", domain);

  if (error) {
    throw new Error(`Failed to resolve credential domain organizations: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.organization_id).filter(Boolean))];
}

export async function resolveOrganizationIdsForRiscHints(
  supabaseClient: SupabaseClient,
  hints: RiscSubjectHint[],
): Promise<string[]> {
  const organizationIds = new Set<string>();
  const scopedOrganizationIds = new Set<string>();
  const refreshTokenPrefixes: string[] = [];

  for (const hint of hints) {
    if (hint.googleUserId) {
      for (const organizationId of await resolveOrganizationsByGoogleUserId(
        supabaseClient,
        hint.googleUserId,
      )) {
        scopedOrganizationIds.add(organizationId);
        organizationIds.add(organizationId);
      }
    }

    if (hint.email) {
      for (const organizationId of await resolveOrganizationsByEmailDomain(
        supabaseClient,
        hint.email,
      )) {
        scopedOrganizationIds.add(organizationId);
        organizationIds.add(organizationId);
      }
    }

    if (hint.refreshTokenPrefix) {
      refreshTokenPrefixes.push(hint.refreshTokenPrefix);
    }
  }

  for (const prefix of refreshTokenPrefixes) {
    for (const organizationId of await resolveOrganizationsByRefreshTokenPrefix(
      supabaseClient,
      prefix,
      [...scopedOrganizationIds],
    )) {
      organizationIds.add(organizationId);
    }
  }

  return [...organizationIds];
}

export async function disconnectOrganizationsForRiscPayload(
  supabaseClient: SupabaseClient,
  payload: SecurityEventTokenPayload,
): Promise<{ disconnectedOrganizationIds: string[] }> {
  if (isVerificationOnlyEvent(payload) || !hasSupportedRevocationEvents(payload)) {
    return { disconnectedOrganizationIds: [] };
  }

  const hints = extractSubjectHints(payload);
  const organizationIds = await resolveOrganizationIdsForRiscHints(supabaseClient, hints);
  const disconnectedOrganizationIds: string[] = [];

  for (const organizationId of organizationIds) {
    await disconnectGoogleWorkspaceForOrganization(supabaseClient, organizationId);
    disconnectedOrganizationIds.push(organizationId);
  }

  return { disconnectedOrganizationIds };
}

/** Test helper to reset JWKS cache between Deno tests. */
export function resetGoogleJwksCacheForTests(): void {
  cachedJwks = null;
  cachedJwksFetchedAt = 0;
}
