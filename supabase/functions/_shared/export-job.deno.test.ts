import { assertEquals } from "jsr:@std/assert@1";
import {
  buildExportStoragePath,
  isAsyncExportReportType,
  parseExportJobMessage,
} from "./export-job.ts";
import {
  buildEquipmentCsvFromRows,
  buildWorkOrdersCsvFromRows,
} from "./export-csv-from-rows.ts";

Deno.test("parseExportJobMessage accepts valid payloads", () => {
  const parsed = parseExportJobMessage({
    export_log_id: "11111111-1111-1111-1111-111111111111",
    organization_id: "22222222-2222-2222-2222-222222222222",
    user_id: "33333333-3333-3333-3333-333333333333",
    report_type: "equipment",
  });
  assertEquals(parsed?.report_type, "equipment");
});

Deno.test("parseExportJobMessage rejects incomplete payloads", () => {
  assertEquals(parseExportJobMessage({ export_log_id: "x" }), null);
  assertEquals(parseExportJobMessage(null), null);
});

Deno.test("isAsyncExportReportType only allows equipment and work-orders", () => {
  assertEquals(isAsyncExportReportType("equipment"), true);
  assertEquals(isAsyncExportReportType("work-orders"), true);
  assertEquals(isAsyncExportReportType("inventory"), false);
});

Deno.test("buildExportStoragePath uses org/user/job layout", () => {
  assertEquals(
    buildExportStoragePath("org", "user", "job"),
    "org/user/job.csv",
  );
});

Deno.test("buildEquipmentCsvFromRows only emits requested columns (data minimization)", () => {
  const { csvContent, rowCount } = buildEquipmentCsvFromRows(
    [
      {
        id: "e1",
        name: "Pump A",
        manufacturer: "Acme",
        model: "X1",
        serial_number: "SN-1",
        status: "active",
        location: "Yard",
        team_name: "Fleet",
        notes: "secret notes should not appear when not requested",
      },
    ],
    ["name", "status", "team_name"],
  );

  assertEquals(rowCount, 1);
  assertEquals(csvContent.includes("Pump A"), true);
  assertEquals(csvContent.includes("secret notes"), false);
  assertEquals(csvContent.includes("Manufacturer"), false);
  assertEquals(csvContent.startsWith("Name,Status,Team"), true);
});

Deno.test("buildWorkOrdersCsvFromRows formats has_pm and escapes formulas", () => {
  const { csvContent, rowCount } = buildWorkOrdersCsvFromRows(
    [
      {
        id: "w1",
        title: "=HYPERLINK(\"http://evil\")",
        status: "completed",
        priority: "high",
        has_pm: true,
        team_name: "A",
        equipment_name: "B",
        created_date: "2026-07-01T00:00:00Z",
      },
    ],
    ["title", "status", "has_pm"],
  );

  assertEquals(rowCount, 1);
  assertEquals(csvContent.includes("Yes"), true);
  // Formula neutralization prefixes dangerous cells
  assertEquals(csvContent.includes("'=HYPERLINK"), true);
});

Deno.test("empty rows produce No data found", () => {
  const empty = buildEquipmentCsvFromRows([], ["name"]);
  assertEquals(empty.rowCount, 0);
  assertEquals(empty.csvContent, "No data found");
});
