/**
 * Deno unit tests for QuickBooks OAuth callback pure helpers.
 */
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  buildOAuthRedirectUri,
  resolveOAuthRedirectBaseUrl,
  validateOAuthRedirectBaseUrl,
} from "./qb-oauth-redirect-uri.ts";
import { parseOAuthState, validateOAuthStateTimestamp } from "./qb-oauth-state.ts";
import {
  buildAccessDeniedRedirectUrl,
  buildOAuthErrorRedirectUrl,
  buildSuccessRedirectUrl,
} from "./qb-oauth-success-redirect.ts";
import { isValidRedirectUrl, STATE_TTL_MS } from "./qb-oauth-validation.ts";

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

Deno.test("resolveOAuthRedirectBaseUrl derives from SUPABASE_URL when override unset", () => {
  assertEquals(
    resolveOAuthRedirectBaseUrl(undefined, "https://supabase.equipqr.app"),
    "https://supabase.equipqr.app",
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

Deno.test({
  name: "isValidRedirectUrl allows relative paths and production host",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: undefined }, () => {
    const productionUrl = "https://equipqr.app";
    assertEquals(isValidRedirectUrl(null, productionUrl), true);
    assertEquals(isValidRedirectUrl("/dashboard/organization", productionUrl), true);
    assertEquals(isValidRedirectUrl("https://equipqr.app/settings", productionUrl), true);
    assertEquals(isValidRedirectUrl("https://evil.example.com/", productionUrl), false);
  });
});

Deno.test({
  name: "isValidRedirectUrl rejects loopback and broad Vercel hosts in deployed contexts",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://preview.equipqr.app", PRODUCTION_URL: undefined }, () => {
    const productionUrl = "https://preview.equipqr.app";
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", productionUrl), false);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", productionUrl), false);
    assertEquals(isValidRedirectUrl("https://equip-qr-evil.vercel.app/dashboard", productionUrl), false);
  });
});

Deno.test({
  name: "isValidRedirectUrl allows loopback only when public site URL is local",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "http://localhost:8080", PRODUCTION_URL: undefined }, () => {
    assertEquals(isValidRedirectUrl("http://localhost:8080/dashboard", "https://equipqr.app"), true);
    assertEquals(isValidRedirectUrl("http://127.0.0.1:8080/dashboard", "https://equipqr.app"), true);
  });
});

Deno.test({
  name: "isValidRedirectUrl allows preview.equipqr.app when PUBLIC_SITE_URL is production",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: undefined }, () => {
    assertEquals(
      isValidRedirectUrl("https://preview.equipqr.app/dashboard/organization", "https://equipqr.app"),
      true,
    );
  });
});

Deno.test({
  name: "buildSuccessRedirectUrl returns preview origin when shared prod edge uses production PUBLIC_SITE_URL",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: undefined }, () => {
    const url = buildSuccessRedirectUrl({
      productionUrl: "https://equipqr.app",
      originUrl: "https://preview.equipqr.app",
      redirectUrl: "/dashboard/organization/integrations",
      realmId: "realm-preview-1",
    });
    assertEquals(
      url,
      "https://preview.equipqr.app/dashboard/organization/integrations?qb_connected=true&realm_id=realm-preview-1",
    );
  });
});

Deno.test({
  name: "buildSuccessRedirectUrl uses default org path when redirect is invalid",
  permissions: { env: ["PUBLIC_SITE_URL", "PRODUCTION_URL"] },
}, () => {
  withEnv({ PUBLIC_SITE_URL: "https://equipqr.app", PRODUCTION_URL: undefined }, () => {
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
