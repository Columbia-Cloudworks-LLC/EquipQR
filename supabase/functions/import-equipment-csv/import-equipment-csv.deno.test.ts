import { assertEquals } from "jsr:@std/assert@1";
import { __testables } from "./index.ts";

const {
  mapRow,
  validateRow,
  inferType,
  buildUpdateData,
  buildInsertData,
  formatChunkInsertFailureReason,
} = __testables;

Deno.test("mapRow maps standard and custom columns", () => {
  const mapped = mapRow(
    {
      Name: " Excavator ",
      Serial: "SN-100",
      Hours: "42",
      Active: "yes",
    },
    [
      { header: "Name", mappedTo: "name" },
      { header: "Serial", mappedTo: "serial" },
      { header: "Hours", mappedTo: "custom", customKey: "hours" },
      { header: "Active", mappedTo: "custom", customKey: "active" },
      { header: "Ignored", mappedTo: "skip" },
    ]
  );

  assertEquals(mapped.name, "Excavator");
  assertEquals(mapped.serial, "SN-100");
  assertEquals(mapped.customAttributes.hours, 42);
  assertEquals(mapped.customAttributes.active, true);
});

Deno.test("validateRow accepts serial-only or manufacturer+model rows", () => {
  assertEquals(validateRow({ serial: "SN-1", customAttributes: {} }).valid, true);
  assertEquals(
    validateRow({
      manufacturer: "CAT",
      model: "320",
      customAttributes: {},
    }).valid,
    true
  );
  assertEquals(validateRow({ customAttributes: {} }).valid, false);
});

Deno.test("inferType coerces booleans and numbers", () => {
  assertEquals(inferType("true"), true);
  assertEquals(inferType("no"), false);
  assertEquals(inferType("12.5"), 12.5);
  assertEquals(inferType("abc"), "abc");
});

Deno.test("buildUpdateData merges custom attributes and newer maintenance dates", () => {
  const updateData = buildUpdateData(
    {
      name: " Updated ",
      location: " Yard ",
      last_maintenance: "2026-06-01",
      customAttributes: { hours: 100 },
    },
    {
      id: "eq-1",
      last_maintenance: "2026-01-01",
      custom_attributes: { region: "west" },
    }
  );

  assertEquals(updateData.name, "Updated");
  assertEquals(updateData.location, "Yard");
  assertEquals(updateData.last_maintenance, "2026-06-01");
  assertEquals(updateData.last_maintenance_work_order_id, null);
  assertEquals(updateData.custom_attributes, { region: "west", hours: 100 });
});

Deno.test("buildUpdateData keeps existing maintenance when incoming date is older", () => {
  const updateData = buildUpdateData(
    {
      last_maintenance: "2026-01-01",
      customAttributes: {},
    },
    {
      id: "eq-1",
      last_maintenance: "2026-06-01",
      custom_attributes: {},
    }
  );

  assertEquals(updateData.last_maintenance, undefined);
});

Deno.test("buildInsertData applies defaults and optional maintenance", () => {
  const insertData = buildInsertData(
    {
      manufacturer: "CAT",
      model: "320",
      serial: "SN-200",
      location: "Site A",
      last_maintenance: "2026-05-01",
      customAttributes: { color: "yellow" },
    },
    "org-1",
    "import-1",
    "team-1"
  );

  assertEquals(insertData.organization_id, "org-1");
  assertEquals(insertData.name, "CAT 320");
  assertEquals(insertData.serial_number, "SN-200");
  assertEquals(insertData.location, "Site A");
  assertEquals(insertData.import_id, "import-1");
  assertEquals(insertData.team_id, "team-1");
  assertEquals(insertData.last_maintenance, "2026-05-01");
  assertEquals(insertData.custom_attributes, { color: "yellow" });
});

Deno.test("formatChunkInsertFailureReason uses 1-based row numbers", () => {
  const reason = formatChunkInsertFailureReason(2, [4, 5], "duplicate key");
  assertEquals(
    reason,
    "Bulk insert failed for chunk of 2 rows (rows 5-6). Error: duplicate key"
  );
});
