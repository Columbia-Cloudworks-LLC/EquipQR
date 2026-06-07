/**
 * Deno unit tests for Google Workspace OAuth callback pure validation helpers.
 */
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { __gwOauthValidationTestables } from "./gw-oauth-validation.ts";
import { __stateTestables } from "./gw-oauth-state.ts";
import { __gwOauthRedirectUriTestables } from "./gw-oauth-redirect-uri.ts";
import { __gwOauthGoogleApiTestables } from "./gw-oauth-google-api.ts";
import { __gwOauthSuccessRedirectTestables } from "./gw-oauth-success-redirect.ts";

const {
  normalizeDomain,
  isValidEmail,
  isProductionEnvironment,
  isPreviewEnvironment,
  isValidRedirectUrl,
  isTrustedDomain,
  STATE_TTL_MS,
  MAX_CLOCK_SKEW_MS,
} = __gwOauthValidationTestables;

const { parseOAuthState, validateOAuthStateTimestamp } = __stateTestables;
const { buildOAuthRedirectUri, resolveOAuthRedirectBaseUrl } = __gwOauthRedirectUriTestables;
const { extractUserDomain } = __gwOauthGoogleApiTestables;
const { buildSuccessRedirectUrl, resolveFallbackProductionUrl } = __gwOauthSuccessRedirectTestables;

Deno.test("normalizeDomain lowercases and trims", () => {
  assertEquals(normalizeDomain("  Example.COM  "), "example.com");
});

Deno.test("isValidEmail accepts well-formed addresses and rejects malformed", () => {
  assertEquals(isValidEmail("user@example.com"), true);
  assertEquals(isValidEmail("@domain.com"), false);
  assertEquals(isValidEmail("user@"), false);
  assertEquals(isValidEmail(null), false);
});

Deno.test("isValidRedirectUrl allows relative paths and rejects protocol-relative URLs", () => {
  const prevProductionUrl = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.set("PRODUCTION_URL", "https://equipqr.app");
    assertEquals(isValidRedirectUrl("/dashboard", "https://equipqr.app"), true);
    assertEquals(isValidRedirectUrl("//evil.com/path", "https://equipqr.app"), false);
  } finally {
    if (prevProductionUrl === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prevProductionUrl);
    }
  }
});

Deno.test("isTrustedDomain allows equipqr.app subdomains", () => {
  assertEquals(isTrustedDomain("https://preview.equipqr.app/dashboard"), true);
  assertEquals(isTrustedDomain("https://evil.example.com/"), false);
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

Deno.test("parseOAuthState rejects missing sessionToken or nonce", () => {
  const encoded = btoa(JSON.stringify({ timestamp: Date.now() }));
  assertThrows(() => parseOAuthState(encoded), Error, "Missing state parameters");
});

Deno.test("validateOAuthStateTimestamp rejects expired state", () => {
  const expired = {
    sessionToken: "sess",
    nonce: "nonce",
    timestamp: Date.now() - STATE_TTL_MS - 1,
  };
  assertThrows(
    () => validateOAuthStateTimestamp(expired),
    Error,
    "OAuth state has expired",
  );
});

Deno.test("validateOAuthStateTimestamp rejects far-future timestamps", () => {
  const future = {
    sessionToken: "sess",
    nonce: "nonce",
    timestamp: Date.now() + MAX_CLOCK_SKEW_MS + 60_000,
  };
  assertThrows(
    () => validateOAuthStateTimestamp(future),
    Error,
    "invalid timestamp",
  );
});

Deno.test("buildOAuthRedirectUri appends callback path without trailing slash duplication", () => {
  assertEquals(
    buildOAuthRedirectUri("https://supabase.example.co/"),
    "https://supabase.example.co/functions/v1/google-workspace-oauth-callback",
  );
});

Deno.test("resolveOAuthRedirectBaseUrl normalizes retired preview Supabase hostname", () => {
  assertEquals(
    resolveOAuthRedirectBaseUrl(
      "https://supabase.preview.equipqr.app",
      "https://olsdirkvvfegvclbpgrg.supabase.co",
    ),
    "https://olsdirkvvfegvclbpgrg.supabase.co",
  );
});

Deno.test("extractUserDomain uses hosted domain when present", () => {
  const result = extractUserDomain({
    email: "admin@acme.com",
    hd: "acme.com",
  });
  assertEquals(result.userEmail, "admin@acme.com");
  assertEquals(result.userDomain, "acme.com");
});

Deno.test("extractUserDomain blocks consumer gmail domains", () => {
  assertThrows(
    () => extractUserDomain({ email: "user@gmail.com" }),
    Error,
    "Consumer Google accounts",
  );
});

Deno.test("buildSuccessRedirectUrl appends gw_connected query param", () => {
  const url = buildSuccessRedirectUrl({
    originUrl: null,
    redirectUrl: "/dashboard/onboarding/workspace",
    resolvedProductionUrl: "https://equipqr.app",
  });
  assertEquals(url, "https://equipqr.app/dashboard/onboarding/workspace?gw_connected=true");
});

Deno.test("resolveFallbackProductionUrl falls back when PRODUCTION_URL is untrusted", () => {
  const prev = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.set("PRODUCTION_URL", "https://evil.example.com");
    assertEquals(resolveFallbackProductionUrl(), "https://equipqr.app");
  } finally {
    if (prev === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prev);
    }
  }
});

Deno.test("isProductionEnvironment and isPreviewEnvironment prefer PUBLIC_SITE_URL", () => {
  const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
  const prevProduction = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.set("PUBLIC_SITE_URL", "https://preview.equipqr.app");
    Deno.env.set("PRODUCTION_URL", "https://equipqr.app");
    assertEquals(isProductionEnvironment(), true);
    assertEquals(isPreviewEnvironment(), true);
  } finally {
    if (prevPublic === undefined) {
      Deno.env.delete("PUBLIC_SITE_URL");
    } else {
      Deno.env.set("PUBLIC_SITE_URL", prevPublic);
    }
    if (prevProduction === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prevProduction);
    }
  }
});

Deno.test("isProductionEnvironment and isPreviewEnvironment reflect PRODUCTION_URL fallback", () => {
  const prevPublic = Deno.env.get("PUBLIC_SITE_URL");
  const prev = Deno.env.get("PRODUCTION_URL");
  try {
    Deno.env.delete("PUBLIC_SITE_URL");
    Deno.env.set("PRODUCTION_URL", "https://equipqr.app");
    assertEquals(isProductionEnvironment(), true);
    assertEquals(isPreviewEnvironment(), false);

    Deno.env.set("PRODUCTION_URL", "https://preview.equipqr.app");
    assertEquals(isProductionEnvironment(), true);
    assertEquals(isPreviewEnvironment(), true);

    Deno.env.set("PRODUCTION_URL", "http://localhost:8080");
    assertEquals(isProductionEnvironment(), false);
  } finally {
    if (prevPublic === undefined) {
      Deno.env.delete("PUBLIC_SITE_URL");
    } else {
      Deno.env.set("PUBLIC_SITE_URL", prevPublic);
    }
    if (prev === undefined) {
      Deno.env.delete("PRODUCTION_URL");
    } else {
      Deno.env.set("PRODUCTION_URL", prev);
    }
  }
});
