/**
 * Process-export-job lifecycle tests (#1193).
 */

import { assertEquals } from "jsr:@std/assert@1";
import {
  processExportJobPayload,
  resolveWorkOrderExportTeamScope,
  type ExportJobAdminClient,
} from "./index.ts";

type TableState = {
  log?: Record<string, unknown>;
  updates: Record<string, unknown>[];
  uploaded?: { path: string; bytes: number };
  notifications: Record<string, unknown>[];
  equipmentRows?: Record<string, unknown>[];
  workOrderRows?: Record<string, unknown>[];
  orgMemberRole?: string | null;
};

function thenableQuery(data: Record<string, unknown>[]) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const method of [
    "select",
    "eq",
    "order",
    "limit",
    "ilike",
    "not",
    "in",
    "gte",
    "lte",
  ]) {
    api[method] = self;
  }
  api.then = (
    resolve: (value: { data: Record<string, unknown>[]; error: null }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve({ data, error: null }).then(resolve, reject);
  return api;
}

function buildAdminStub(state: TableState): ExportJobAdminClient {
  return {
    from(table: string) {
      if (table === "export_request_log") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: state.log ?? null,
                      error: state.log ? null : { message: "not found" },
                    }),
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            state.updates.push(values);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        } as never;
      }
      if (table === "organization_members") {
        // undefined = default admin for happy-path stubs; null = non-admin.
        const role = state.orgMemberRole === undefined
          ? "owner"
          : state.orgMemberRole;
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          in() {
                            return {
                              maybeSingle: () =>
                                Promise.resolve({
                                  data: role ? { role } : null,
                                  error: null,
                                }),
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        } as never;
      }
      if (table === "equipment") {
        return thenableQuery(
          state.equipmentRows ?? [
            {
              id: "eq-1",
              name: "Loader",
              manufacturer: "Cat",
              model: "950",
              serial_number: "1",
              status: "active",
              location: "Yard",
              teams: { name: "Fleet" },
            },
          ],
        ) as never;
      }
      if (table === "work_orders") {
        return thenableQuery(state.workOrderRows ?? []) as never;
      }
      if (table === "notifications") {
        return {
          insert(row: Record<string, unknown>) {
            state.notifications.push(row);
            return Promise.resolve({ error: null });
          },
        } as never;
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from() {
        return {
          upload(path: string, bytes: Uint8Array) {
            state.uploaded = { path, bytes: bytes.byteLength };
            return Promise.resolve({ error: null });
          },
          createSignedUrl(path: string) {
            return Promise.resolve({
              data: { signedUrl: `https://example.test/${path}` },
              error: null,
            });
          },
        };
      },
    },
  };
}

Deno.test("processExportJobPayload happy path: processing → upload → completed", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    log: {
      id: "job-1",
      status: "pending",
      organization_id: "org-1",
      user_id: "user-1",
      report_type: "equipment",
      request_payload: {
        columns: ["name", "status"],
        filters: {},
      },
    },
  };

  const result = await processExportJobPayload(buildAdminStub(state), {
    export_log_id: "job-1",
    organization_id: "org-1",
    user_id: "user-1",
    report_type: "equipment",
  });

  assertEquals(result.ok, true);
  assertEquals((result.rowCount ?? 0) > 0, true);
  assertEquals(state.updates.some((u) => u.status === "processing"), true);
  assertEquals(state.updates.some((u) => u.status === "completed"), true);
  assertEquals(state.uploaded?.path.includes("org-1/user-1/job-1.csv"), true);
  assertEquals(state.notifications.length, 1);
});

Deno.test("processExportJobPayload rejects invalid payload", async () => {
  const state: TableState = { updates: [], notifications: [] };
  const result = await processExportJobPayload(buildAdminStub(state), {
    export_log_id: "x",
  });
  assertEquals(result.ok, false);
});

Deno.test("processExportJobPayload is idempotent when already completed", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    log: {
      id: "job-1",
      status: "completed",
      organization_id: "org-1",
      user_id: "user-1",
      report_type: "equipment",
      request_payload: {},
    },
  };
  const result = await processExportJobPayload(buildAdminStub(state), {
    export_log_id: "job-1",
    organization_id: "org-1",
    user_id: "user-1",
    report_type: "equipment",
  });
  assertEquals(result.ok, true);
  assertEquals(state.updates.length, 0);
});

Deno.test("processExportJobPayload rejects mismatched log ownership", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    log: {
      id: "job-1",
      status: "pending",
      organization_id: "org-other",
      user_id: "user-1",
      report_type: "equipment",
      request_payload: {},
    },
  };
  const result = await processExportJobPayload(buildAdminStub(state), {
    export_log_id: "job-1",
    organization_id: "org-1",
    user_id: "user-1",
    report_type: "equipment",
  });
  assertEquals(result.ok, false);
  assertEquals(result.error?.includes("does not match"), true);
});

Deno.test("processExportJobPayload marks failed when upload errors", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    log: {
      id: "job-2",
      status: "pending",
      organization_id: "org-1",
      user_id: "user-1",
      report_type: "equipment",
      request_payload: { columns: ["name"], filters: {} },
    },
  };
  const stub = buildAdminStub(state);
  stub.storage.from = () => ({
    upload() {
      return Promise.resolve({ error: { message: "quota exceeded" } });
    },
    createSignedUrl() {
      return Promise.resolve({ data: null, error: { message: "n/a" } });
    },
  });

  const result = await processExportJobPayload(stub, {
    export_log_id: "job-2",
    organization_id: "org-1",
    user_id: "user-1",
    report_type: "equipment",
  });

  assertEquals(result.ok, false);
  assertEquals(state.updates.some((u) => u.status === "failed"), true);
});

Deno.test("processExportJobPayload fails work-orders without team scope for non-admin", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    orgMemberRole: null,
    log: {
      id: "job-wo",
      status: "pending",
      organization_id: "org-1",
      user_id: "user-1",
      report_type: "work-orders",
      request_payload: { columns: ["title"], filters: {} },
    },
  };

  const result = await processExportJobPayload(buildAdminStub(state), {
    export_log_id: "job-wo",
    organization_id: "org-1",
    user_id: "user-1",
    report_type: "work-orders",
  });

  assertEquals(result.ok, false);
  assertEquals(result.error?.includes("accessibleTeamIds"), true);
  assertEquals(state.updates.some((u) => u.status === "failed"), true);
});

Deno.test("resolveWorkOrderExportTeamScope allows null teams for admin", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    orgMemberRole: "admin",
  };
  const scope = await resolveWorkOrderExportTeamScope(
    buildAdminStub(state),
    "user-1",
    "org-1",
    null,
  );
  assertEquals(scope.ok, true);
  if (scope.ok) assertEquals(scope.teamIds, null);
});

Deno.test("resolveWorkOrderExportTeamScope rejects missing teams for non-admin", async () => {
  const state: TableState = {
    updates: [],
    notifications: [],
    orgMemberRole: null,
  };
  const scope = await resolveWorkOrderExportTeamScope(
    buildAdminStub(state),
    "user-1",
    "org-1",
    null,
  );
  assertEquals(scope.ok, false);
});
