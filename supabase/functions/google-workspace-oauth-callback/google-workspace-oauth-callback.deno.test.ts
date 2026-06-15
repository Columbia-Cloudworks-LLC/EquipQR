/**
 * Deno unit tests for Google Workspace OAuth callback pure validation helpers.
 */
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { __gwOauthValidationTestables } from "./gw-oauth-validation.ts";
import { __stateTestables } from "./gw-oauth-state.ts";
import { __gwOauthRedirectUriTestables } from "./gw-oauth-redirect-uri.ts";
import { __gwOauthGoogleApiTestables } from "./gw-oauth-google-api.ts";
import { __gwOauthSuccessRedirectTestables } from "./gw-oauth-success-redirect.ts";
import { __gwOauthUserErrorTestables } from "./gw-oauth-user-error.ts";

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
const { buildSuccessRedirectUrl, resolveFallbackProductionUrl, buildGoogleOAuthErrorRedirectUrl } = __gwOauthSuccessRedirectTestables;

function withEnv(updates: Record<string, string | undefined>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) {
    previous.set(key, Deno.env.get(key));
    const value = updates[key];
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test("normalizeDomain lowercases and trims", () => {
  assertEquals(normalizeDomain("  Example.COM  "), "example.com");
});

Deno.test("isValidEmail accepts well-formed addresses and rejects malformed", () => {
  assertEquals(isValidEmail("user@example.com"), true);
  assertEquals(isValidEmail("@domain.com"), false);
  assertEquals(isValidEmail("user@"), false);
  assertEquals(isValidEmail(null), false);
});

Deno.test({
  name: "isValidRedirectUrl allows relative paths and rejects protocol-relative URLs",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
  fn: () => {
    withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: "https://equipqr.app" }, () => {
      assertEquals(isValidRedirectUrl("/dashboard", "https://equipqr.app"), true);
      assertEquals(isValidRedirectUrl("//evil.com/path", "https://equipqr.app"), false);
    });
  },
});

Deno.test({
  name: "isValidRedirectUrl rejects loopback and broad Vercel hosts in deployed contexts",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://preview.equipqr.app", PRODUCTION_URL: "https://equipqr.app" }, () => {
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", "https://preview.equipqr.app"), false);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", "https://preview.equipqr.app"), false);
    assertEquals(isValidRedirectUrl("https://equip-qr-evil.vercel.app/dashboard", "https://preview.equipqr.app"), false);
  });
});

Deno.test({
  name: "isValidRedirectUrl allows loopback only when public site URL is local",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "http://localhost:8080", PRODUCTION_URL: "https://equipqr.app" }, () => {
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", "https://equipqr.app"), true);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", "https://equipqr.app"), true);
  });
});

Deno.test({
  name: "isTrustedDomain allows equipqr.app subdomains",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: "https://equipqr.app" }, () => {
    assertEquals(isTrustedDomain("https://preview.equipqr.app/dashboard"), true);
    assertEquals(isTrustedDomain("https://evil.example.com/"), false);
  });
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
    "https://supabase.equipqr.app",
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

Deno.test({
  name: "buildSuccessRedirectUrl appends gw_connected query param",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: "https://equipqr.app" }, () => {
    const url = buildSuccessRedirectUrl({
      originUrl: null,
      redirectUrl: "/dashboard/onboarding/workspace",
      resolvedProductionUrl: "https://equipqr.app",
    });
    assertEquals(url, "https://equipqr.app/dashboard/onboarding/workspace?gw_connected=true");
  });
});

Deno.test({
  name: "buildGoogleOAuthErrorRedirectUrl honors integrations redirectUrl from OAuth session",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://preview.equipqr.app", PRODUCTION_URL: "https://equipqr.app" }, () => {
    const url = buildGoogleOAuthErrorRedirectUrl({
      originUrl: "https://preview.equipqr.app",
      redirectUrl: "/dashboard/organization/integrations",
      resolvedProductionUrl: "https://preview.equipqr.app",
      errorCode: "oauth_failed",
      supportRef: "corr-abc123",
    });
    assertEquals(
      url,
      "https://preview.equipqr.app/dashboard/organization/integrations?gw_error=oauth_failed&gw_ref=corr-abc123",
    );
  });
});

Deno.test({
  name: "resolveFallbackProductionUrl falls back when PRODUCTION_URL is untrusted",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
  fn: () => {
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
  },
});

Deno.test({
  name: "isProductionEnvironment and isPreviewEnvironment prefer PUBLIC_SITE_URL",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
  fn: () => {
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
  },
});

Deno.test({
  name: "isProductionEnvironment and isPreviewEnvironment reflect PRODUCTION_URL fallback",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
  fn: () => {
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
  },
});

Deno.test("resolveGoogleOAuthCallbackErrorCode maps Google callback errors", () => {
  const { resolveGoogleOAuthCallbackErrorCode } = __gwOauthUserErrorTestables;

  assertEquals(resolveGoogleOAuthCallbackErrorCode("access_denied"), "access_denied");
  assertEquals(resolveGoogleOAuthCallbackErrorCode("invalid_scope"), "misconfigured");
  assertEquals(resolveGoogleOAuthCallbackErrorCode("server_error"), "oauth_failed");
  assertEquals(resolveGoogleOAuthCallbackErrorCode(null), "oauth_failed");
});

Deno.test("resolveGoogleWorkspaceOAuthErrorCode maps internal messages to safe codes", () => {
  const { resolveGoogleWorkspaceOAuthErrorCode } = __gwOauthUserErrorTestables;

  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("Invalid or expired OAuth session. Please try again."),
    ),
    "session_expired",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("Only Google Workspace administrators can connect their organization to EquipQR."),
    ),
    "not_workspace_admin",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(
      new Error("This Google Workspace domain is already linked to another EquipQR organization."),
    ),
    "domain_already_linked",
  );
  assertEquals(
    resolveGoogleWorkspaceOAuthErrorCode(new Error("unexpected internal failure")),
    "oauth_failed",
  );
});
