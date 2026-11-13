import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  applyOrganizationScope,
  exportReportRequestSchema,
  geocodeLocationRequestSchema,
  getGoogleExportDestinationRequestSchema,
  parseJsonBody,
  requireOrgAdminAccess,
  requireOrgMembership,
  resolveInventoryScanRequestSchema,
  setGoogleExportDestinationRequestSchema,
  withOrgAdminScope,
  withOrgScope,
} from "./org-scoped-queries.ts";
import { createPostgrestStub } from "./postgrest-test-stub.ts";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

type MembershipRow = { role: string; status?: string } | null;

/**
 * Real Supabase client over a PostgREST stub (see postgrest-test-stub.ts):
 * the query's own filters are applied to the row (status defaults to
 * "active"), so a production query that drops a filter gets the row back.
 */
function createMembershipMock(row: MembershipRow, options?: { queryError?: boolean }) {
  return createPostgrestStub(
    { organization_members: row ? [{ status: "active", ...row }] : [] },
    { failTables: options?.queryError ? ["organization_members"] : [] },
  );
}

// =============================================================================
// parseJsonBody + schemas
// =============================================================================

Deno.test("parseJsonBody accepts valid geocode request", () => {
  const parsed = parseJsonBody(geocodeLocationRequestSchema, {
    organizationId: ORG_ID,
    input: "123 Main St",
  });
  assert(parsed.success);
  if (parsed.success) {
    assertEquals(parsed.data.organizationId, ORG_ID);
    assertEquals(parsed.data.input, "123 Main St");
  }
});

Deno.test("parseJsonBody rejects invalid organizationId uuid", () => {
  const parsed = parseJsonBody(geocodeLocationRequestSchema, {
    organizationId: "not-a-uuid",
    input: "123 Main St",
  });
  assert(!parsed.success);
  if (!parsed.success) {
    assertEquals(parsed.status, 400);
    assertEquals(parsed.error, "Invalid organizationId");
  }
});

Deno.test("parseJsonBody rejects wrong organizationId type", () => {
  const parsed = parseJsonBody(geocodeLocationRequestSchema, {
    organizationId: 123,
    input: "123 Main St",
  });
  assert(!parsed.success);
  if (!parsed.success) {
    assertEquals(parsed.error, "Invalid organizationId");
  }
});

Deno.test("parseJsonBody rejects missing organizationId", () => {
  const parsed = parseJsonBody(geocodeLocationRequestSchema, {
    input: "123 Main St",
  });
  assert(!parsed.success);
  if (!parsed.success) {
    assertEquals(parsed.error, "organizationId is required");
  }
});

Deno.test("exportReportRequestSchema requires columns", () => {
  const parsed = parseJsonBody(exportReportRequestSchema, {
    reportType: "equipment",
    organizationId: ORG_ID,
    filters: {},
    columns: [],
    format: "csv",
  });
  assert(!parsed.success);
});

Deno.test("getGoogleExportDestinationRequestSchema defaults documentType", () => {
  const parsed = parseJsonBody(getGoogleExportDestinationRequestSchema, {
    organizationId: ORG_ID,
  });
  assert(parsed.success);
  if (parsed.success) {
    assertEquals(parsed.data.documentType, "work-orders-internal-packet");
  }
});

Deno.test("setGoogleExportDestinationRequestSchema validates selectionKind", () => {
  const parsed = parseJsonBody(setGoogleExportDestinationRequestSchema, {
    organizationId: ORG_ID,
    selectionKind: "invalid",
    parentId: "folder-123",
  });
  assert(!parsed.success);
});

Deno.test("resolveInventoryScanRequestSchema accepts optional org", () => {
  const parsed = parseJsonBody(resolveInventoryScanRequestSchema, {
    scanned_value: "SKU-001",
  });
  assert(parsed.success);
});

// =============================================================================
// requireOrgMembership / requireOrgAdminAccess
// =============================================================================

Deno.test("requireOrgMembership returns role for active member", async () => {
  const { client: supabase } = createMembershipMock({ role: "member" });
  const result = await requireOrgMembership(supabase, USER_ID, ORG_ID);
  assert(!("error" in result));
  if (!("error" in result)) {
    assertEquals(result.organizationId, ORG_ID);
    assertEquals(result.role, "member");
  }
});

Deno.test("requireOrgMembership rejects non-member", async () => {
  const { client: supabase } = createMembershipMock(null);
  const result = await requireOrgMembership(supabase, USER_ID, ORG_ID);
  assert("error" in result);
  if ("error" in result) {
    assertEquals(result.status, 403);
  }
});

Deno.test("requireOrgAdminAccess allows owner", async () => {
  const { client: supabase } = createMembershipMock({ role: "owner" });
  const result = await requireOrgAdminAccess(supabase, USER_ID, ORG_ID);
  assert("ok" in result);
  assertEquals(result.ok, true);
});
Deno.test("requireOrgMembership returns 500 on query failure", async () => {
  const { client: supabase } = createMembershipMock(null, { queryError: true });
  const result = await requireOrgMembership(supabase, USER_ID, ORG_ID);
  assert("error" in result);
  if ("error" in result) {
    assertEquals(result.status, 500);
  }
});

Deno.test("requireOrgAdminAccess returns 500 on query failure", async () => {
  const { client: supabase } = createMembershipMock({ role: "admin" }, { queryError: true });
  const result = await requireOrgAdminAccess(supabase, USER_ID, ORG_ID);
  assert("error" in result);
  if ("error" in result) {
    assertEquals(result.status, 500);
  }
});

Deno.test("requireOrgAdminAccess filters to active owner/admin rows", async () => {
  const { client: supabase, queries } = createMembershipMock({ role: "admin" });
  await requireOrgAdminAccess(supabase, USER_ID, ORG_ID);
  assertEquals(queries.length, 1);
  assertEquals(queries[0]!.filters, {
    user_id: `eq.${USER_ID}`,
    organization_id: `eq.${ORG_ID}`,
    status: "eq.active",
    role: "in.(owner,admin)",
  });
});

Deno.test("requireOrgAdminAccess rejects member", async () => {
  const { client: supabase } = createMembershipMock({ role: "member" });
  const result = await requireOrgAdminAccess(supabase, USER_ID, ORG_ID);
  assert("error" in result);
  if ("error" in result) {
    assertEquals(result.status, 403);
  }
});

Deno.test("requireOrgAdminAccess rejects an admin whose membership is not active", async () => {
  const { client: supabase } = createMembershipMock({ role: "admin", status: "pending" });
  const result = await requireOrgAdminAccess(supabase, USER_ID, ORG_ID);
  assert("error" in result);
  if ("error" in result) {
    assertEquals(result.status, 403);
  }
});

// =============================================================================
// withOrgScope / withOrgAdminScope
// =============================================================================

Deno.test("withOrgScope runs callback when member", async () => {
  const { client: supabase } = createMembershipMock({ role: "admin" });
  const result = await withOrgScope(
    supabase,
    USER_ID,
    ORG_ID,
    async ({ organizationId }) => organizationId.toUpperCase(),
  );
  assert("ok" in result && result.ok);
  if (result.ok) {
    assertEquals(result.data, ORG_ID.toUpperCase());
    assertEquals(result.role, "admin");
  }
});

Deno.test("withOrgScope blocks non-member before callback", async () => {
  const { client: supabase } = createMembershipMock(null);
  let callbackRan = false;
  const result = await withOrgScope(
    supabase,
    USER_ID,
    ORG_ID,
    async () => {
      callbackRan = true;
      return "should-not-run";
    },
  );
  assertEquals(result.ok, false);
  assertEquals(callbackRan, false);
});

Deno.test("withOrgAdminScope runs callback for admin", async () => {
  const { client: supabase } = createMembershipMock({ role: "admin" });
  const result = await withOrgAdminScope(
    supabase,
    USER_ID,
    ORG_ID,
    async () => "done",
  );
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.data, "done");
  }
});

// =============================================================================
// applyOrganizationScope
// =============================================================================

Deno.test("applyOrganizationScope adds organization_id filter", () => {
  const filters: Array<[string, string]> = [];
  const query = {
    eq: (column: string, value: string) => {
      filters.push([column, value]);
      return query;
    },
  };

  applyOrganizationScope(query, ORG_ID);
  assertEquals(filters, [["organization_id", ORG_ID]]);
});
