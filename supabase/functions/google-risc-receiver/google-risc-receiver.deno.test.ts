import { assertEquals } from "jsr:@std/assert@1";
import {
  extractSubjectHints,
  hasSupportedRevocationEvents,
  isVerificationOnlyEvent,
  parseSecurityEventToken,
  RISC_REVOCATION_EVENT_TYPES,
  RISC_VERIFICATION_EVENT,
} from "./risc-helpers.ts";
import { handleGoogleRiscRequest } from "./index.ts";

const TEST_AUDIENCE = "test-workspace-client-id";

function buildUnsignedSetPayload(events: Record<string, Record<string, unknown>>) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: "https://accounts.google.com",
    aud: TEST_AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
    jti: "test-jti",
    events,
  }));
  return `${header}.${payload}.signature`;
}

Deno.test("parseSecurityEventToken decodes events from JWT payload", () => {
  const token = buildUnsignedSetPayload({
    [RISC_VERIFICATION_EVENT]: { state: "test-state" },
  });

  const payload = parseSecurityEventToken(token);
  assertEquals(payload.jti, "test-jti");
  assertEquals(isVerificationOnlyEvent(payload), true);
});

Deno.test("extractSubjectHints captures refresh token and account subject fields", () => {
  const token = buildUnsignedSetPayload({
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

  const hints = extractSubjectHints(parseSecurityEventToken(token));
  assertEquals(hints.length, 2);
  assertEquals(hints.some((hint) => hint.refreshTokenPrefix === "abc123"), true);
  assertEquals(hints.some((hint) => hint.googleUserId === "google-user-1"), true);
});

Deno.test("hasSupportedRevocationEvents ignores verification-only payloads", () => {
  const verificationPayload = parseSecurityEventToken(buildUnsignedSetPayload({
    [RISC_VERIFICATION_EVENT]: { state: "configured" },
  }));
  assertEquals(hasSupportedRevocationEvents(verificationPayload), false);

  const revocationPayload = parseSecurityEventToken(buildUnsignedSetPayload({
    "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
      subject: { sub: "google-user-2" },
    },
  }));
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
      acceptedAudiences: [TEST_AUDIENCE],
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
        acceptedAudiences: [TEST_AUDIENCE],
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
      body: buildUnsignedSetPayload({ [RISC_VERIFICATION_EVENT]: { state: "ok" } }),
    }),
    {
      verifyToken: async () => parseSecurityEventToken(buildUnsignedSetPayload({
        [RISC_VERIFICATION_EVENT]: { state: "ok" },
      })),
      disconnectOrganizations: async () => {
        disconnectCalled = true;
        return { disconnectedOrganizationIds: [] };
      },
      createServiceClient: () => {
        throw new Error("should not create client");
      },
      acceptedAudiences: [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
  assertEquals(disconnectCalled, false);
});

Deno.test("handleGoogleRiscRequest disconnects organizations for supported revocation events", async () => {
  const response = await handleGoogleRiscRequest(
    new Request("https://example.test/functions/v1/google-risc-receiver", {
      method: "POST",
      body: buildUnsignedSetPayload({
        "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
          subject: { sub: "google-user-3", email: "admin@example.com" },
        },
      }),
    }),
    {
      verifyToken: async () => parseSecurityEventToken(buildUnsignedSetPayload({
        "https://schemas.openid.net/secevent/risc/event-type/account-disabled": {
          subject: { sub: "google-user-3", email: "admin@example.com" },
        },
      })),
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: ["org-1"] }),
      createServiceClient: () => ({}) as never,
      acceptedAudiences: [TEST_AUDIENCE],
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
      body: buildUnsignedSetPayload({
        "https://schemas.openid.net/secevent/example/event-type/unknown": {},
      }),
    }),
    {
      verifyToken: async () => parseSecurityEventToken(buildUnsignedSetPayload({
        "https://schemas.openid.net/secevent/example/event-type/unknown": {},
      })),
      disconnectOrganizations: async () => ({ disconnectedOrganizationIds: [] }),
      createServiceClient: () => ({}) as never,
      acceptedAudiences: [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.disconnectedOrganizationIds, []);
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
      acceptedAudiences: [TEST_AUDIENCE],
    },
  );

  assertEquals(response.status, 200);
});

