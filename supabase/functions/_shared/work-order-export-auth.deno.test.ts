import { assert, assertEquals } from "jsr:@std/assert@1";
import { createPostgrestStub } from "./postgrest-test-stub.ts";
import { resolveWorkOrderExportAccess } from "./work-order-export-auth.ts";

const USER_ID = "user-1";
const ORG_ID = "org-1";

Deno.test("resolveWorkOrderExportAccess grants full access to an active org admin", async () => {
  const { client, queries } = createPostgrestStub({
    organization_members: [{ role: "admin", status: "active" }],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), { mode: "admin" });
  assertEquals(queries.map((q) => q.table), ["organization_members"]);
});

Deno.test("resolveWorkOrderExportAccess scopes requestors and viewers to their teams", async () => {
  const { client, queries } = createPostgrestStub({
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
  assertEquals(teamQuery.filters.role, "in.(requestor,viewer)");
  assertEquals(teamQuery.filters.user_id, `eq.${USER_ID}`);
  assertEquals(teamQuery.filters["teams.organization_id"], `eq.${ORG_ID}`);
});

Deno.test("resolveWorkOrderExportAccess does not treat an inactive org admin as admin", async () => {
  const { client } = createPostgrestStub({
    organization_members: [{ role: "admin", status: "pending" }],
    team_members: [],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});

Deno.test("resolveWorkOrderExportAccess denies users with no requestor or viewer team role", async () => {
  const { client } = createPostgrestStub({
    organization_members: [],
    team_members: [{ team_id: "team-1", role: "technician" }],
  });

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});

Deno.test("resolveWorkOrderExportAccess denies when the team membership query fails", async () => {
  const { client } = createPostgrestStub(
    { organization_members: [], team_members: [{ team_id: "team-1", role: "viewer" }] },
    { failTables: ["team_members"] },
  );

  assertEquals(await resolveWorkOrderExportAccess(client, USER_ID, ORG_ID), null);
});
