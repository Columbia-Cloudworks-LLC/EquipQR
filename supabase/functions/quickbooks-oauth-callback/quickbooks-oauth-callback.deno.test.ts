/**
 * Deno unit tests for QuickBooks OAuth callback pure helpers.
 */
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  buildOAuthRedirectUri,
  validateOAuthRedirectBaseUrl,
} from "./qb-oauth-redirect-uri.ts";
import { parseOAuthState, validateOAuthStateTimestamp } from "./qb-oauth-state.ts";
import {
  buildAccessDeniedRedirectUrl,
  buildOAuthErrorRedirectUrl,
  buildSuccessRedirectUrl,
} from "./qb-oauth-success-redirect.ts";
import { isValidRedirectUrl, STATE_TTL_MS } from "./qb-oauth-validation.ts";

Deno.test("validateOAuthRedirectBaseUrl rejects malformed base URLs", () => {
  assertThrows(
    () => validateOAuthRedirectBaseUrl("not-a-url"),
    Error,
    "Invalid OAuth redirect base URL configuration",
  );
});

Deno.test("buildOAuthRedirectUri trims trailing slashes and appends callback path", () => {
  assertEquals(
    buildOAuthRedirectUri("https://supabase.equipqr.app/"),
    "https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback",
  );
});

Deno.test("parseOAuthState decodes base64 JSON state", () => {
  const state = {
    sessionToken: "sess-123",
    nonce: "nonce-456",
    timestamp: Date.now(),
  };
  const encoded = btoa(JSON.stringify(state));
  const parsed = parseOAuthState(encoded);
  assertEquals(parsed.sessionToken, "sess-123");
  assertEquals(parsed.nonce, "nonce-456");
});

Deno.test("parseOAuthState rejects missing session token or nonce", () => {
  const missingToken = btoa(JSON.stringify({ nonce: "n", timestamp: Date.now() }));
  assertThrows(() => parseOAuthState(missingToken), Error, "Missing session token");

  const missingNonce = btoa(JSON.stringify({ sessionToken: "s", timestamp: Date.now() }));
  assertThrows(() => parseOAuthState(missingNonce), Error, "Missing nonce");
});

Deno.test("validateOAuthStateTimestamp rejects expired state", () => {
  const expired = {
    sessionToken: "sess",
    nonce: "nonce",
    timestamp: Date.now() - STATE_TTL_MS - 1,
  };
  assertThrows(
    () => validateOAuthStateTimestamp(expired, Date.now()),
    Error,
    "OAuth state has expired",
  );
});

Deno.test("isValidRedirectUrl allows relative paths and production host", () => {
  const productionUrl = "https://equipqr.app";
  assertEquals(isValidRedirectUrl(null, productionUrl), true);
  assertEquals(isValidRedirectUrl("/dashboard/organization", productionUrl), true);
  assertEquals(isValidRedirectUrl("https://equipqr.app/settings", productionUrl), true);
  assertEquals(isValidRedirectUrl("https://evil.example.com/", productionUrl), false);
});

Deno.test("buildSuccessRedirectUrl uses default org path when redirect is invalid", () => {
  const url = buildSuccessRedirectUrl({
    productionUrl: "https://equipqr.app",
    originUrl: null,
    redirectUrl: "https://evil.example.com/path",
    realmId: "realm-1",
  });
  assertEquals(
    url,
    "https://equipqr.app/dashboard/organization?qb_connected=true&realm_id=realm-1",
  );
});

Deno.test("buildAccessDeniedRedirectUrl encodes error parameters", () => {
  const url = buildAccessDeniedRedirectUrl(
    "https://equipqr.app",
    "access_denied",
    "User denied consent",
  );
  assertEquals(
    url,
    "https://equipqr.app/dashboard/organization?qb_error=access_denied&qb_error_description=User%20denied%20consent",
  );
});

Deno.test("buildOAuthErrorRedirectUrl encodes oauth failure message", () => {
  const url = buildOAuthErrorRedirectUrl("https://equipqr.app", "Token exchange failed");
  assertEquals(
    url,
    "https://equipqr.app/dashboard/organization?qb_error=oauth_failed&qb_error_description=Token%20exchange%20failed",
  );
});
