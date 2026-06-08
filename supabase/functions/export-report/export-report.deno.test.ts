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

function createRateLimitMock(results: RateLimitQueryResult[]): SupabaseClient {
  let callIndex = 0;

  const buildChain = (result: RateLimitQueryResult) => {
    const terminal = () =>
      Promise.resolve({
        count: result.count ?? null,
        error: result.error ?? null,
        data: null,
      });

    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.limit = () => terminal();
    chain.eq = () => chain;
    chain.gte = () => terminal();
    return chain;
  };

  return {
    from: () => {
      const result = results[callIndex] ?? { count: 0, error: null };
      callIndex += 1;
      return buildChain(result);
    },
  } as unknown as SupabaseClient;
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
