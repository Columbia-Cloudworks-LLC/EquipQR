import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  GoogleWorkspaceOAuthUserError,
} from "./gw-oauth-user-error.ts";
import {
  __gwOauthCredentialsStoreTestables,
  DOMAIN_ALREADY_LINKED_ERROR,
} from "./gw-oauth-credentials-store.ts";

const { resolveWorkspaceDomainClaim } = __gwOauthCredentialsStoreTestables;

type DomainRow = { organization_id: string };

function createWorkspaceDomainsMock(options: {
  existingOrgClaims?: DomainRow[];
  insertError?: { code?: string; message: string } | null;
  conflictOrgClaims?: DomainRow[];
}) {
  let lookupCount = 0;
  const state = { insertCalled: false };

  const client = {
    from: (table: string) => {
      if (table !== "workspace_domains") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          ilike: (_column: string, _value: string) => ({
            eq: (_orgColumn: string, _orgValue: string) => ({
              maybeSingle: () => {
                lookupCount += 1;
                const claims = lookupCount === 1
                  ? (options.existingOrgClaims ?? [])
                  : (options.conflictOrgClaims ?? options.existingOrgClaims ?? []);
                const row = claims[0] ?? null;
                return Promise.resolve({ data: row, error: null });
              },
            }),
          }),
        }),
        insert: () => {
          state.insertCalled = true;
          return Promise.resolve({ error: options.insertError ?? null });
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    state,
  };
}

Deno.test("resolveWorkspaceDomainClaim returns without insert when org already owns domain", async () => {
  const { client, state } = createWorkspaceDomainsMock({
    existingOrgClaims: [{ organization_id: "org-1" }],
  });

  const result = await resolveWorkspaceDomainClaim(client, {
    effectiveOrgId: "org-1",
    domain: "example.com",
  });

  assertEquals(result, { insertedNewClaim: false });
  assertEquals(state.insertCalled, false);
});

Deno.test("resolveWorkspaceDomainClaim inserts when org has no existing claim", async () => {
  const { client, state } = createWorkspaceDomainsMock({
    existingOrgClaims: [],
    insertError: null,
  });

  const result = await resolveWorkspaceDomainClaim(client, {
    effectiveOrgId: "org-1",
    domain: "example.com",
  });

  assertEquals(result, { insertedNewClaim: true });
  assertEquals(state.insertCalled, true);
});

Deno.test("resolveWorkspaceDomainClaim treats same-org unique violation as race resolved", async () => {
  const { client } = createWorkspaceDomainsMock({
    existingOrgClaims: [],
    insertError: { code: "23505", message: "duplicate key value" },
    conflictOrgClaims: [{ organization_id: "org-1" }],
  });

  const result = await resolveWorkspaceDomainClaim(client, {
    effectiveOrgId: "org-1",
    domain: "example.com",
  });

  assertEquals(result, { insertedNewClaim: false });
});

Deno.test("resolveWorkspaceDomainClaim fails closed when unique violation has no org-scoped match", async () => {
  const { client } = createWorkspaceDomainsMock({
    existingOrgClaims: [],
    insertError: { code: "23505", message: "duplicate key value" },
    conflictOrgClaims: [],
  });

  await assertRejects(
    () => resolveWorkspaceDomainClaim(client, {
      effectiveOrgId: "org-1",
      domain: "example.com",
    }),
    GoogleWorkspaceOAuthUserError,
    DOMAIN_ALREADY_LINKED_ERROR,
  );
});
