/**
 * Shared reports layer unit tests (#1192).
 */

import { assertEquals } from "jsr:@std/assert@1";
import {
  REPORT_COLUMN_WHITELISTS,
  filterAllowedColumns,
} from "./column-whitelists.ts";
import { __fetchRowsTestables } from "./fetch-rows.ts";
import {
  computeIsLowStock,
  formatPrimaryFlag,
  formatUnitCost,
  resolveMemberType,
} from "./inventory-formatters.ts";
import {
  buildReportCsv,
  formatHasPm,
  formatScannedAt,
  formatSubmittedAt,
  __formatCsvTestables,
} from "./format-csv.ts";

Deno.test("filterAllowedColumns drops unknown keys per report type", () => {
  assertEquals(
    filterAllowedColumns("inventory", ["name", "sku", "secret_column"]),
    ["name", "sku"],
  );
  assertEquals(
    filterAllowedColumns("equipment", ["name", "custom_attributes", "bogus"]),
    ["name", "custom_attributes"],
  );
});

Deno.test("REPORT_COLUMN_WHITELISTS cover all seven Fleet Export Console types", () => {
  const types = [
    "equipment",
    "work-orders",
    "inventory",
    "scans",
    "operator-check-ins",
    "quick-forms",
    "alternate-groups",
  ] as const;
  for (const type of types) {
    assertEquals(REPORT_COLUMN_WHITELISTS[type].length > 0, true);
  }
});

Deno.test("formatUnitCost converts cents to dollar string", () => {
  assertEquals(formatUnitCost(1250), "$12.50");
  assertEquals(formatUnitCost(null), "");
});

Deno.test("computeIsLowStock flags at-or-below threshold", () => {
  assertEquals(computeIsLowStock(2, 5), "Yes");
  assertEquals(computeIsLowStock(5, 5), "Yes");
  assertEquals(computeIsLowStock(6, 5), "No");
});

Deno.test("formatHasPm renders Yes/No", () => {
  assertEquals(formatHasPm(true), "Yes");
  assertEquals(formatHasPm(false), "No");
});

Deno.test("formatScannedAt returns space-separated timestamp", () => {
  assertEquals(formatScannedAt("2026-03-15T14:30:00Z"), "2026-03-15 14:30:00");
  assertEquals(formatScannedAt(null), "");
});

Deno.test("formatSubmittedAt returns space-separated timestamp", () => {
  assertEquals(formatSubmittedAt("2026-03-15T14:30:00Z"), "2026-03-15 14:30:00");
  assertEquals(formatSubmittedAt(null), "");
});

Deno.test("resolveMemberType distinguishes inventory vs identifier rows", () => {
  assertEquals(resolveMemberType("inv-1"), "Inventory Item");
  assertEquals(resolveMemberType(null), "Part Identifier");
});

Deno.test("formatPrimaryFlag renders Yes/No", () => {
  assertEquals(formatPrimaryFlag(true), "Yes");
  assertEquals(formatPrimaryFlag(false), "No");
});

Deno.test("buildReportCsv returns no-data for empty inventory rows", () => {
  const result = buildReportCsv("inventory", [], ["name", "sku"]);
  assertEquals(result.csvContent, "No data found");
  assertEquals(result.rowCount, 0);
});

Deno.test("buildReportCsv formats inventory rows with explicit columns", () => {
  const result = buildReportCsv("inventory", [{
    name: "Filter",
    sku: "FLT-1",
    quantity_on_hand: 2,
    low_stock_threshold: 5,
    default_unit_cost: 999,
    location: "Shelf A",
    created_at: "2026-01-15T12:00:00Z",
  }], ["name", "sku", "is_low_stock", "default_unit_cost"]);

  assertEquals(result.rowCount, 1);
  assertEquals(result.csvContent.includes("Filter"), true);
  assertEquals(result.csvContent.includes("$9.99"), true);
  assertEquals(result.csvContent.includes("Yes"), true);
});

Deno.test("SCANS_TABLE_SELECT uses inner equipment join for early org scoping", () => {
  assertEquals(__fetchRowsTestables.SCANS_TABLE_SELECT.includes("equipment!inner"), true);
});

Deno.test("ALTERNATE_GROUP_COLUMNS avoids select star", () => {
  assertEquals(__fetchRowsTestables.ALTERNATE_GROUP_COLUMNS.includes("*"), false);
  assertEquals(__fetchRowsTestables.ALTERNATE_GROUP_COLUMNS.includes("organization_id"), true);
});

Deno.test("formatCapturedFieldsSummary joins labeled values", () => {
  const summary = __formatCsvTestables.formatCapturedFieldsSummary({
    operator_field_values: [{ label: "Hours", value: 8 }],
    client_field_values: [{ label: "Site", value: "Yard" }],
    equipment_field_values: [],
  });
  assertEquals(summary, "Hours: 8 | Site: Yard");
});

Deno.test("formatTemplateName reads template_snapshot.name", () => {
  assertEquals(
    __formatCsvTestables.formatTemplateName({ template_snapshot: { name: "Daily" } }),
    "Daily",
  );
  assertEquals(__formatCsvTestables.formatTemplateName({ template_snapshot: null }), "");
});

Deno.test("formatQuickFormCapturedFieldsSummary joins labeled values", () => {
  const summary = __formatCsvTestables.formatQuickFormCapturedFieldsSummary({
    field_values: [
      { label: "Name", value: "Sam" },
      { label: "Hours", value: 4 },
    ],
  });
  assertEquals(summary, "Name: Sam | Hours: 4");
});

Deno.test("formatQuickFormName reads form_snapshot.name", () => {
  assertEquals(
    __formatCsvTestables.formatQuickFormName({ form_snapshot: { name: "Visitor Log" } }),
    "Visitor Log",
  );
  assertEquals(__formatCsvTestables.formatQuickFormName({ form_snapshot: null }), "Quick form");
});

Deno.test("buildReportCsv formats quick form rows with explicit columns", () => {
  const result = buildReportCsv("quick-forms", [{
    id: "sub-1",
    submitted_at: "2026-03-15T14:30:00Z",
    form_snapshot: { name: "Visitor Log" },
    field_values: [{ label: "Name", value: "Sam" }],
    client_context: {
      browser_timezone: "America/Chicago",
      gps: { latitude: 38.6, longitude: -90.2 },
    },
  }], ["form_name", "submitted_at", "captured_fields_summary", "gps"]);

  assertEquals(result.rowCount, 1);
  assertEquals(result.csvContent.includes("Visitor Log"), true);
  assertEquals(result.csvContent.includes("Name: Sam"), true);
  assertEquals(result.csvContent.includes("38.6, -90.2"), true);
});

Deno.test("OPERATOR_CHECKINS_TABLE_SELECT uses inner equipment join for org scoping", () => {
  assertEquals(__fetchRowsTestables.OPERATOR_CHECKINS_TABLE_SELECT.includes("equipment!inner"), true);
});

Deno.test("buildReportCsv returns no-data when all requested columns are disallowed", () => {
  const result = buildReportCsv("inventory", [{
    name: "Filter",
    sku: "FLT-1",
  }], ["not_a_real_column"]);
  assertEquals(result.csvContent, "No data found");
  assertEquals(result.rowCount, 0);
});

Deno.test("applyRowPagination uses range when offset is provided", () => {
  const calls: string[] = [];
  const query = {
    range(from: number, to: number) {
      calls.push(`range:${from}-${to}`);
      return this;
    },
    limit(count: number) {
      calls.push(`limit:${count}`);
      return this;
    },
  } as unknown as import("./types.ts").ReportQueryBuilder;

  __fetchRowsTestables.applyRowPagination(query, 100, 50);
  assertEquals(calls, ["range:50-149"]);
});

Deno.test("fetchAlternateGroupRows returns bounded flattened members", async () => {
  const rows = [
    { id: "m1", group_id: "g1", inventory_item_id: "i1", is_primary: true, inventory_items: { name: "A", sku: "1", quantity_on_hand: 1, low_stock_threshold: 1, default_unit_cost: 100, location: null }, part_identifiers: null },
    { id: "m2", group_id: "g1", inventory_item_id: null, is_primary: false, inventory_items: null, part_identifiers: { identifier_type: "oem", raw_value: "X", manufacturer: null } },
  ];

  const client = {
    from(table: string) {
      if (table === "part_alternate_groups") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({
                  data: [
                    { id: "g1", name: "Group 1", status: "verified", description: null, notes: null },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "part_alternate_group_members") {
        return {
          select: () => ({
            in: () => ({
              order: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: rows, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const { fetchReportRows } = await import("./fetch-rows.ts");
  const page = await fetchReportRows(client as never, {
    reportType: "alternate-groups",
    organizationId: "org-1",
    filters: {},
    columns: ["group_name", "item_name"],
    limit: 10,
  });

  assertEquals(page.length, 2);
  assertEquals((page[0] as Record<string, unknown>).item_name, "A");
});

Deno.test("resolveLimit defaults to 50000", () => {
  assertEquals(__fetchRowsTestables.resolveLimit(), 50_000);
  assertEquals(__fetchRowsTestables.resolveLimit(100), 100);
});
