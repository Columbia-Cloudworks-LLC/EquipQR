import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { encryptToken } from "./crypto.ts";
import {
  __testables,
  getGoogleWorkspaceAccessToken,
  GOOGLE_SCOPES,
} from "./google-workspace-token.ts";

const { mergeGoogleWorkspaceScopeStrings, resolveGoogleWorkspaceScopes, buildCredentialsRefreshUpdate } =
  __testables;

const DIRECTORY_SCOPE = GOOGLE_SCOPES.DIRECTORY_READONLY;
const STORED_SCOPES = [
  DIRECTORY_SCOPE,
  GOOGLE_SCOPES.DRIVE_READONLY,
  GOOGLE_SCOPES.DRIVE_FILE,
].join(" ");
const REFRESHED_SCOPES = [
  GOOGLE_SCOPES.DRIVE_READONLY,
  GOOGLE_SCOPES.DRIVE_FILE,
  GOOGLE_SCOPES.DOCUMENTS,
].join(" ");
const INCREMENTAL_REFRESH_SCOPES = GOOGLE_SCOPES.DOCUMENTS;

const TEST_ENCRYPTION_KEY = "7FqX2mNk9pRt6vWz4HcJ3Lb8DgY1As0u";

async function withGoogleWorkspaceEnv(fn: () => Promise<void>): Promise<void> {
  const prior: Record<string, string | undefined> = {
    TOKEN_ENCRYPTION_KEY: Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? undefined,
    GOOGLE_WORKSPACE_CLIENT_ID: Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID") ?? undefined,
    GOOGLE_WORKSPACE_CLIENT_SECRET: Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET") ?? undefined,
  };

  Deno.env.set("TOKEN_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
  Deno.env.set("GOOGLE_WORKSPACE_CLIENT_ID", "test-google-client-id");
  Deno.env.set("GOOGLE_WORKSPACE_CLIENT_SECRET", "test-google-client-secret");

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

function createCredentialsMock(storedScopes: string | null, encryptedRefreshToken: string) {
  const captured = {
    updatePayload: null as Record<string, unknown> | null,
  };

  const client = {
    from: (table: string) => {
      if (table !== "google_workspace_credentials") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      domain: "example.com",
                      refresh_token: encryptedRefreshToken,
                      scopes: storedScopes,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          captured.updatePayload = payload;
          return {
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        },
      };
    },
  };

  return { client, captured };
}

Deno.test("mergeGoogleWorkspaceScopeStrings deduplicates and combines scope strings", () => {
  assertEquals(
    mergeGoogleWorkspaceScopeStrings(STORED_SCOPES, INCREMENTAL_REFRESH_SCOPES),
    `${STORED_SCOPES} ${INCREMENTAL_REFRESH_SCOPES}`,
  );
});

Deno.test("resolveGoogleWorkspaceScopes merges incremental refresh grants with stored scopes", () => {
  assertEquals(
    resolveGoogleWorkspaceScopes(INCREMENTAL_REFRESH_SCOPES, STORED_SCOPES),
    `${STORED_SCOPES} ${INCREMENTAL_REFRESH_SCOPES}`,
  );
});

Deno.test("resolveGoogleWorkspaceScopes falls back to stored scopes when refresh omits scope", () => {
  assertEquals(resolveGoogleWorkspaceScopes(undefined, STORED_SCOPES), STORED_SCOPES);
});

Deno.test("buildCredentialsRefreshUpdate omits scopes when refresh response has no scope", () => {
  const expiresAt = new Date("2026-06-01T12:00:00.000Z");
  const update = buildCredentialsRefreshUpdate({}, expiresAt);

  assertEquals(update.access_token_expires_at, expiresAt.toISOString());
  assertEquals("scopes" in update, false);
});

Deno.test("buildCredentialsRefreshUpdate merges refreshed scopes with stored scopes", () => {
  const expiresAt = new Date("2026-06-01T12:00:00.000Z");
  const update = buildCredentialsRefreshUpdate(
    { scope: INCREMENTAL_REFRESH_SCOPES },
    expiresAt,
    STORED_SCOPES,
  );

  assertEquals(update.scopes, `${STORED_SCOPES} ${INCREMENTAL_REFRESH_SCOPES}`);
});

Deno.test("getGoogleWorkspaceAccessToken preserves stored scopes when refresh omits scope", async () => {
  await withGoogleWorkspaceEnv(async () => {
    const encryptedRefreshToken = await encryptToken("refresh-token-value", TEST_ENCRYPTION_KEY);
    const { client, captured } = createCredentialsMock(STORED_SCOPES, encryptedRefreshToken);

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: "new-access-token",
              expires_in: 3600,
              token_type: "Bearer",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );

      const result = await getGoogleWorkspaceAccessToken(
        client as unknown as SupabaseClient,
        "org-1",
      );

      assertEquals(result.accessToken, "new-access-token");
      assertEquals(result.scopes, STORED_SCOPES);
      assertEquals(captured.updatePayload?.scopes, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

Deno.test("getGoogleWorkspaceAccessToken returns and persists refreshed scopes when provided", async () => {
  await withGoogleWorkspaceEnv(async () => {
    const encryptedRefreshToken = await encryptToken("refresh-token-value", TEST_ENCRYPTION_KEY);
    const { client, captured } = createCredentialsMock(STORED_SCOPES, encryptedRefreshToken);

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: "new-access-token",
              expires_in: 3600,
              token_type: "Bearer",
              scope: REFRESHED_SCOPES,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );

      const mergedScopes = mergeGoogleWorkspaceScopeStrings(STORED_SCOPES, REFRESHED_SCOPES);

      const result = await getGoogleWorkspaceAccessToken(
        client as unknown as SupabaseClient,
        "org-1",
      );

      assertEquals(result.scopes, mergedScopes);
      assertEquals(captured.updatePayload?.scopes, mergedScopes);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
