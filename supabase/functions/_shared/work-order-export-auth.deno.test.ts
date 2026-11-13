import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { resolveWorkOrderExportAccess } from "./work-order-export-auth.ts";

const USER_ID = "user-1";
const ORG_ID = "org-1";

type Row = Record<string, unknown>;
type Query = { table: string; eq: Array<[string, unknown]>; in: Array<[string, unknown[]]> };

/**
 * Mock client that applies each query's `.eq` / `.in` filters to the rows of its
 * table, so a production query that drops a filter returns rows it should not.
 * Filters on columns a row does not carry are recorded but not applied.
 */
function createClient(tables: Record<string, Row[]>, options?: { failTable?: string }) {
  const queries: Query[] = [];
  const client = {
    from: (table: string) => {
      const query: Query = { table, eq: [], in: [] };
      queries.push(query);
      const result = () => {
        if (options?.failTable === table) {
          return { data: null, error: { code: "XX000", message: "db error" } };
        }
        const rows = (tables[table] ?? []).filter((row) =>
          query.eq.every(([column, value]) => !(column in row) || row[column] === value) &&
          query.in.every(([column, values]) => !(column in row) || values.includes(row[column]))
        );
        return { data: rows, error: null };
      };
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (column: string, value: unknown) => {
          query.eq.push([column, value]);
          return chain;
        },
        in: (column: string, values: unknown[]) => {
          query.in.push([column, values]);
          return chain;
        },
        maybeSingle: () => {
          const { data, error } = result();
          return Promise.resolve({ data: data?.[0] ?? null, error });
        },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve, reject),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

Deno.test("resolveWorkOrderExportAccess grants full access to an active org admin", async () => {
  const { client, queries } = createClient({
    organization_members: [{ role: "admin", status: "active" }],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), { mode: "admin" });
  assertEquals(queries.map((q) => q.table), ["organization_members"]);
});

Deno.test("resolveWorkOrderExportAccess scopes requestors and viewers to their teams", async () => {
  const { client, queries } = createClient({
    organization_members: [{ role: "member", status: "active" }],
    team_members: [
      { team_id: "team-1", role: "requestor" },
      { team_id: "team-1", role: "viewer" },
      { team_id: "team-2", role: "viewer" },
      { team_id: "team-3", role: "technician" },
      { team_id: "team-4", role: "manager" },
    ],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), {
    mode: "scoped",
    teamIds: ["team-1", "team-2"],
  });

  const teamQuery = queries.find((q) => q.table === "team_members");
  assert(teamQuery);
  assertEquals(teamQuery.in, [["role", ["requestor", "viewer"]]]);
  assert(teamQuery.eq.some(([column, value]) => column === "user_id" && value === USER_ID));
  assert(teamQuery.eq.some(([column, value]) => column === "teams.organization_id" && value === ORG_ID));
});

Deno.test("resolveWorkOrderExportAccess does not treat an inactive org admin as admin", async () => {
  const { client } = createClient({
    organization_members: [{ role: "admin", status: "pending" }],
    team_members: [],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});

Deno.test("resolveWorkOrderExportAccess denies users with no requestor or viewer team role", async () => {
  const { client } = createClient({
    organization_members: [],
    team_members: [{ team_id: "team-1", role: "technician" }],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});

Deno.test("resolveWorkOrderExportAccess denies when the team membership query fails", async () => {
  const { client } = createClient(
    { organization_members: [], team_members: [{ team_id: "team-1", role: "viewer" }] },
    { failTable: "team_members" },
  );

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});
