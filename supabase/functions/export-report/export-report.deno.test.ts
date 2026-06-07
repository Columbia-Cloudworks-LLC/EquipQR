import { assertEquals } from "jsr:@std/assert@1";
import { __alternateGroupsCsvTestables } from "./alternate-groups-csv-export.ts";
import { __equipmentCsvTestables } from "./equipment-csv-export.ts";
import { __inventoryCsvTestables } from "./inventory-csv-export.ts";
import { __scansCsvTestables } from "./scans-csv-export.ts";
import { __workOrdersCsvTestables } from "./work-orders-csv-export.ts";

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
