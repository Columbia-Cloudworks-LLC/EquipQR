import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { __alternateGroupsCsvTestables } from "./alternate-groups-csv-export.ts";
import { __equipmentCsvTestables } from "./equipment-csv-export.ts";
import { __inventoryCsvTestables } from "./inventory-csv-export.ts";
import { __rateLimitTestables, checkRateLimit } from "./rate-limit.ts";
import { __scansCsvTestables } from "./scans-csv-export.ts";
import { __workOrdersCsvTestables } from "./work-orders-csv-export.ts";

type RateLimitQueryResult = {
  count?: number | null;
  error?: { code?: string; message?: string } | null;
};

type RateLimitQueryFilter = {
  method: "eq" | "gte";
  column: string;
  value: unknown;
};

type RateLimitQueryCall = {
  table: string;
  filters: RateLimitQueryFilter[];
};

type RateLimitMock = SupabaseClient & {
  __calls: RateLimitQueryCall[];
};

function createRateLimitMock(results: RateLimitQueryResult[]): RateLimitMock {
  let callIndex = 0;
  const calls: RateLimitQueryCall[] = [];

  const buildChain = (result: RateLimitQueryResult, call: RateLimitQueryCall) => {
    const terminal = () =>
      Promise.resolve({
        count: result.count ?? null,
        error: result.error ?? null,
        data: null,
      });

    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.limit = () => terminal();
    chain.eq = (column: string, value: unknown) => {
      call.filters.push({ method: "eq", column, value });
      return chain;
    };
    chain.gte = (column: string, value: unknown) => {
      call.filters.push({ method: "gte", column, value });
      return terminal();
    };
    return chain;
  };

  const client = {
    from: (table: string) => {
      const result = results[callIndex] ?? { count: 0, error: null };
      const call: RateLimitQueryCall = { table, filters: [] };
      calls.push(call);
      callIndex += 1;
      return buildChain(result, call);
    },
  } as unknown as RateLimitMock;

  client.__calls = calls;
  return client;
}

function getEqFilters(call: RateLimitQueryCall): Record<string, unknown> {
  return Object.fromEntries(
    call.filters
      .filter((filter) => filter.method === "eq")
      .map((filter) => [filter.column, filter.value]),
  );
}

Deno.test("formatUnitCost converts cents to dollar string", () => {
  assertEquals(__inventoryCsvTestables.formatUnitCost(1250), "$12.50");
  assertEquals(__inventoryCsvTestables.formatUnitCost(null), "");
});

Deno.test("computeIsLowStock flags at-or-below threshold", () => {
  assertEquals(__inventoryCsvTestables.computeIsLowStock(2, 5), "Yes");
  assertEquals(__inventoryCsvTestables.computeIsLowStock(5, 5), "Yes");
  assertEquals(__inventoryCsvTestables.computeIsLowStock(6, 5), "No");
});

Deno.test("formatHasPm renders Yes/No", () => {
  assertEquals(__workOrdersCsvTestables.formatHasPm(true), "Yes");
  assertEquals(__workOrdersCsvTestables.formatHasPm(false), "No");
});

Deno.test("formatScannedAt returns space-separated timestamp", () => {
  assertEquals(__scansCsvTestables.formatScannedAt("2026-03-15T14:30:00Z"), "2026-03-15 14:30:00");
  assertEquals(__scansCsvTestables.formatScannedAt(null), "");
});

Deno.test("buildEquipmentUrl uses provided site base", () => {
  assertEquals(
    __equipmentCsvTestables.buildEquipmentUrl("abc-123", "https://preview.equipqr.app"),
    "https://preview.equipqr.app/dashboard/equipment/abc-123",
  );
});

Deno.test("resolveMemberType distinguishes inventory vs identifier rows", () => {
  assertEquals(__alternateGroupsCsvTestables.resolveMemberType("inv-1"), "Inventory Item");
  assertEquals(__alternateGroupsCsvTestables.resolveMemberType(null), "Part Identifier");
});

Deno.test("formatPrimaryFlag renders Yes/No", () => {
  assertEquals(__alternateGroupsCsvTestables.formatPrimaryFlag(true), "Yes");
  assertEquals(__alternateGroupsCsvTestables.formatPrimaryFlag(false), "No");
});

Deno.test("isMissingRelationError recognizes Postgres undefined_table code", () => {
  assertEquals(__rateLimitTestables.isMissingRelationError({ code: "42P01" }), true);
  assertEquals(__rateLimitTestables.isMissingRelationError({ code: "42501" }), false);
  assertEquals(__rateLimitTestables.isMissingRelationError(null), false);
});

Deno.test("checkRateLimit skips only when export_request_log relation is missing", async () => {
  const allowed = await checkRateLimit(
    createRateLimitMock([{ error: { code: "42P01", message: "relation does not exist" } }]),
    "user-1",
    "org-1",
  );
  assertEquals(allowed, true);
});

Deno.test("checkRateLimit fails closed on probe errors other than missing table", async () => {
  const allowed = await checkRateLimit(
    createRateLimitMock([{ error: { code: "42501", message: "permission denied" } }]),
    "user-1",
    "org-1",
  );
  assertEquals(allowed, false);
});

Deno.test("checkRateLimit fails closed when user count query errors", async () => {
  const allowed = await checkRateLimit(
    createRateLimitMock([
      { error: null, count: 0 },
      { error: { code: "XX000", message: "db error" }, count: null },
    ]),
    "user-1",
    "org-1",
  );
  assertEquals(allowed, false);
});

Deno.test("checkRateLimit fails closed when org count query errors", async () => {
  const allowed = await checkRateLimit(
    createRateLimitMock([
      { error: null, count: 0 },
      { error: null, count: 2 },
      { error: { code: "XX000", message: "db error" }, count: null },
    ]),
    "user-1",
    "org-1",
  );
  assertEquals(allowed, false);
});

Deno.test("checkRateLimit scopes every export_request_log query by organization", async () => {
  const mock = createRateLimitMock([
    { error: null, count: 0 },
    { error: null, count: 4 },
    { error: null, count: 49 },
  ]);

  const allowed = await checkRateLimit(mock, "user-1", "org-1");

  assertEquals(allowed, true);
  assertEquals(mock.__calls.length, 3);
  assertEquals(mock.__calls.map((call) => call.table), [
    "export_request_log",
    "export_request_log",
    "export_request_log",
  ]);
  assertEquals(getEqFilters(mock.__calls[0]).organization_id, "org-1");
  assertEquals(getEqFilters(mock.__calls[1]).organization_id, "org-1");
  assertEquals(getEqFilters(mock.__calls[1]).user_id, "user-1");
  assertEquals(getEqFilters(mock.__calls[2]).organization_id, "org-1");
});

Deno.test("checkRateLimit enforces user and org limits when counts succeed", async () => {
  const underLimit = await checkRateLimit(
    createRateLimitMock([
      { error: null, count: 0 },
      { error: null, count: 4 },
      { error: null, count: 49 },
    ]),
    "user-1",
    "org-1",
  );
  assertEquals(underLimit, true);

  const userLimited = await checkRateLimit(
    createRateLimitMock([
      { error: null, count: 0 },
      { error: null, count: 5 },
    ]),
    "user-1",
    "org-1",
  );
  assertEquals(userLimited, false);

  const orgLimited = await checkRateLimit(
    createRateLimitMock([
      { error: null, count: 0 },
      { error: null, count: 0 },
      { error: null, count: 50 },
    ]),
    "user-1",
    "org-1",
  );
  assertEquals(orgLimited, false);
});
