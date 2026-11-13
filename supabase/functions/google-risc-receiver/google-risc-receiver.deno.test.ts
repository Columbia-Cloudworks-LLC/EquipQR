import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  extractSubjectHints,
  GOOGLE_JWKS_URL,
  hasSupportedRevocationEvents,
  resolveOrganizationIdsForRiscHints,
  RISC_REVOCATION_EVENT_TYPES,
  RISC_VERIFICATION_EVENT,
  type SecurityEventTokenPayload,
  verifyGoogleSecurityEventToken,
} from "./risc-helpers.ts";
import { handleGoogleRiscRequest } from "./index.ts";

const TEST_AUDIENCE = "test-workspace-client-id";
/** Opaque request body; handler tests inject `verifyToken`, so it is never decoded. */
const RAW_TOKEN = "header.payload.signature";

function buildSetPayload(
  events: Record<string, Record<string, unknown>>,
  overrides: Partial<SecurityEventTokenPayload> = {},
): SecurityEventTokenPayload {
  return {
    iss: "https://accounts.google.com",
    aud: TEST_AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
    jti: "test-jti",
    events,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// verifyGoogleSecurityEventToken — real RS256 verification against a stubbed JWKS
// ---------------------------------------------------------------------------

const SIGNING_KID = "test-signing-kid";

function base64Url(bytes: Uint8Array | string): string {
  const binary = typeof bytes === "string"
    ? bytes
    : Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
}

const signingKeys = await generateRsaKeyPair();
const otherKeys = await generateRsaKeyPair();
const publicJwk = { ...(await crypto.subtle.exportKey("jwk", signingKeys.publicKey)), kid: SIGNING_KID };

async function signToken(
  payload: unknown,
  options: { header?: Record<string, unknown>; privateKey?: CryptoKey } = {},
): Promise<string> {
  const header = options.header ?? { alg: "RS256", kid: SIGNING_KID, typ: "secevent+jwt" };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    options.privateKey ?? signingKeys.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function withStubbedJwks(fn: () => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== GOOGLE_JWKS_URL) {
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }
    return Promise.resolve(Response.json({ keys: [publicJwk] }));
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const REVOCATION_EVENTS = {
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
    subject: { subject_type: "iss-sub", sub: "google-user-1" },
  },
};

Deno.test("verifyGoogleSecurityEventToken accepts a Google-signed token for an accepted audience", () =>
  withStubbedJwks(async () => {
    const token = await signToken(buildSetPayload(REVOCATION_EVENTS));
    const payload = await verifyGoogleSecurityEventToken(token, ["other-client", TEST_AUDIENCE]);
    assertEquals(payload.jti, "test-jti");
    assertEquals(hasSupportedRevocationEvents(payload), true);
  }));

Deno.test("verifyGoogleSecurityEventToken rejects a token for another audience", () =>
  withStubbedJwks(async () => {
    const token = await signToken(buildSetPayload(REVOCATION_EVENTS, { aud: "someone-else" }));
    await assertRejects(
      () => verifyGoogleSecurityEventToken(token, [TEST_AUDIENCE]),
      Error,
      "audience mismatch",
    );
  }));

Deno.test("verifyGoogleSecurityEventToken rejects a token from another issuer", () =>
  withStubbedJwks(async () => {
    const token = await signToken(buildSetPayload(REVOCATION_EVENTS, { iss: "https://evil.example" }));
    await assertRejects(
      () => verifyGoogleSecurityEventToken(token, [TEST_AUDIENCE]),
      Error,
      "issuer",
    );
  }));

Deno.test("verifyGoogleSecurityEventToken rejects a token signed by a key Google did not publish", () =>
  withStubbedJwks(async () => {
    const token = await signToken(buildSetPayload(REVOCATION_EVENTS), { privateKey: otherKeys.privateKey });
    await assertRejects(
      () => verifyGoogleSecurityEventToken(token, [TEST_AUDIENCE]),
      Error,
      "signature verification failed",
    );
  }));

Deno.test("verifyGoogleSecurityEventToken rejects a payload altered after signing", () =>
  withStubbedJwks(async () => {
    const [header, , signature] = (await signToken(buildSetPayload(REVOCATION_EVENTS))).split(".");
    const forgedPayload = base64Url(JSON.stringify(buildSetPayload(REVOCATION_EVENTS, { jti: "forged" })));
    await assertRejects(
      () => verifyGoogleSecurityEventToken(`${header}.${forgedPayload}.${signature}`, [TEST_AUDIENCE]),
      Error,
      "signature verification failed",
    );
  }));

Deno.test("verifyGoogleSecurityEventToken rejects alg none", () =>
  withStubbedJwks(async () => {
    const unsigned = `${base64Url(JSON.stringify({ alg: "none", kid: SIGNING_KID }))}.${
      base64Url(JSON.stringify(buildSetPayload(REVOCATION_EVENTS)))
    }.`;
    await assertRejects(
      () => verifyGoogleSecurityEventToken(unsigned, [TEST_AUDIENCE]),
      Error,
      "Unsupported security event token algorithm",
    );
  }));

Deno.test("verifyGoogleSecurityEventToken rejects a signed token without an events claim", () =>
  withStubbedJwks(async () => {
    const { events: _events, ...withoutEvents } = buildSetPayload(REVOCATION_EVENTS);
    const token = await signToken(withoutEvents);
    await assertRejects(
      () => verifyGoogleSecurityEventToken(token, [TEST_AUDIENCE]),
      Error,
      "missing events claim",
    );
  }));

Deno.test("extractSubjectHints captures refresh token and account subject fields", () => {
  const payload = buildSetPayload({
    "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked": {
      subject: {
        subject_type: "oauth-token",
        token_type: "refresh_token",
        token: "abc123",
      },
    },
    "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked": {
      subject: {
        subject_type: "iss-sub",
        sub: "google-user-1",
        email: "admin@example.com",
      },
    },
  });

  const hints = extractSubjectHints(payload);
  assertEquals(hints.length, 2);
  assertEquals(hints.some((hint) => hint.refreshTokenPrefix === "abc123"), true);
  assertEquals(hints.some((hint) => hint.googleUserId === "google-user-1"), true);
});

Deno.test("hasSupportedRevocationEvents ignores verification-only payloads", () => {
  const verificationPayload = buildSetPayload({
    [RISC_VERIFICATION_EVENT]: { state: "configured" },
  });
  assertEquals(hasSupportedRevocationEvents(verificationPayload), false);

  const revocationPayload = buildSetPayload({
    "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
      subject: { sub: "google-user-2" },
    },
  });
  assertEquals(hasSupportedRevocationEvents(revocationPayload), true);
  assertEquals(
    RISC_REVOCATION_EVENT_TYPES.has("https://schemas.openid.net/secevent/risc/event-type/account-disabled"),
    true,
  );
});

Deno.test("handleGoogleRiscRequest rejects missing token bodies", async () => {
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", { method: "POST" }),
    {
      verifyToken: async () => {
        throw new Error("should not verify");
      },
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: [] }),
      createServiceClient: () => {
        throw new Error("should not create client");
      },
      resolveAcceptedAudiences: () => [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 400);
});

Deno.test("handleGoogleRiscRequest returns 401 for invalid tokens without logging token material", async () => {
  let loggedBody = "";
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    loggedBody += args.join(" ");
  };

  try {
    const response = await handleGoogleRiscRequest(
      new Request("https://example.test/functions/v1/google-risc-receiver", {
        method: "POST",
        body: "raw.jwt.token",
      }),
      {
        verifyToken: async () => {
          throw new Error("Invalid security event token");
        },
        disconnectOrganizations: async () => ({ disconnectedOrganizationIds: [] }),
        createServiceClient: () => {
          throw new Error("should not create client");
        },
        resolveAcceptedAudiences: () => [TEST_AUDIENCE],
      },
    );

    assertEquals(response.status, 401);
    assertEquals(loggedBody.includes("raw.jwt.token"), false);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("handleGoogleRiscRequest acknowledges verification events without disconnecting", async () => {
  let disconnectCalled = false;
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", {
      method: "POST",
      body: RAW_TOKEN,
    }),
    {
      verifyToken: async () => buildSetPayload({
        [RISC_VERIFICATION_EVENT]: { state: "ok" },
      }),
      disconnectOrganizations: async () => {
        disconnectCalled = true;
        return { disconnectedOrganizationIds: [] };
      },
      createServiceClient: () => {
        throw new Error("should not create client");
      },
      resolveAcceptedAudiences: () => [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
  assertEquals(disconnectCalled, false);
});

Deno.test("handleGoogleRiscRequest disconnects organizations for supported revocation events", async () => {
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", {
      method: "POST",
      body: RAW_TOKEN,
    }),
    {
      verifyToken: async () => buildSetPayload({
        "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
          subject: { sub: "google-user-3", email: "admin@example.com" },
        },
      }),
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: ["org-1"] }),
      createServiceClient: () => ({}) as never,
      resolveAcceptedAudiences: () => [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.disconnectedOrganizationIds, ["org-1"]);
});

Deno.test("handleGoogleRiscRequest no-ops unsupported events", async () => {
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", {
      method: "POST",
      body: RAW_TOKEN,
    }),
    {
      verifyToken: async () => buildSetPayload({
        "https://schemas.openid.net/secevent/example/event-type/unknown": {},
      }),
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: [] }),
      createServiceClient: () => ({}) as never,
      resolveAcceptedAudiences: () => [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.disconnectedOrganizationIds, []);
});

Deno.test({
  name: "resolveOrganizationIdsForRiscHints resolves token-only refresh prefix via bounded scan",
  permissions: { env: true },
  fn: async () => {
    const previousKey = Deno.env.get("TOKEN_ENCRYPTION_KEY");
    Deno.env.set("TOKEN_ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcw==");

    try {
      const calls: string[] = [];
      const supabaseClient = {
        from: (table: string) => {
          calls.push(table);
          if (table === "google_workspace_credentials") {
            return {
              select: () => ({
                order: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [{
                        organization_id: "org-token-only",
                        refresh_token: "legacy-plaintext-token-abc123suffix",
                      }],
                      error: null,
                    }),
                }),
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            };
          }

          if (table === "google_workspace_directory_users") {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            };
          }

          throw new Error(`Unexpected table ${table}`);
        },
      } as unknown as import("npm:@supabase/supabase-js@2.45.0").SupabaseClient;

      const organizationIds = await resolveOrganizationIdsForRiscHints(supabaseClient, [{
        refreshTokenPrefix: "legacy-plaintext-token",
      }]);

      assertEquals(organizationIds.includes("org-token-only"), true);
      assertEquals(calls.includes("google_workspace_credentials"), true);
    } finally {
      if (previousKey === undefined) {
        Deno.env.delete("TOKEN_ENCRYPTION_KEY");
      } else {
        Deno.env.set("TOKEN_ENCRYPTION_KEY", previousKey);
      }
    }
  },
});

Deno.test("handleGoogleRiscRequest allows CORS preflight", async () => {
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", {
      method: "OPTIONS",
      headers: { Origin: "https://accounts.google.com" },
    }),
    {
      verifyToken: async () => {
        throw new Error("should not verify");
      },
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: [] }),
      createServiceClient: () => {
        throw new Error("should not create client");
      },
      resolveAcceptedAudiences: () => [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
});

