/**
 * Deno unit tests for Google Sheets export pure validation helpers.
 */
import { assertEquals } from "jsr:@std/assert@1";
import { GOOGLE_SCOPES } from "../_shared/google-workspace-token.ts";
import { WORKSHEET_NAMES } from "../_shared/work-orders-export-data.ts";
import { __gwSheetsAuthGateTestables } from "./gw-sheets-auth-gate.ts";
import { __gwSheetsExportRunTestables } from "./gw-sheets-export-run.ts";
import { __gwSheetsRequestTestables } from "./gw-sheets-request.ts";

const {
  isValidSheetsExportDateField,
  validateSheetsExportRequest,
} = __gwSheetsRequestTestables;

Deno.test("isValidSheetsExportDateField accepts created_date and completed_date", () => {
  assertEquals(isValidSheetsExportDateField("created_date"), true);
  assertEquals(isValidSheetsExportDateField("completed_date"), true);
});

Deno.test("isValidSheetsExportDateField rejects unknown date fields", () => {
  assertEquals(isValidSheetsExportDateField("due_date"), false);
  assertEquals(isValidSheetsExportDateField(undefined), false);
});

Deno.test("validateSheetsExportRequest requires organizationId", () => {
  const result = validateSheetsExportRequest({ filters: { dateField: "created_date" } });
  assertEquals(result instanceof Response, true);
  if (result instanceof Response) {
    assertEquals(result.status, 400);
  }
});

Deno.test("validateSheetsExportRequest requires filters object", () => {
  const result = validateSheetsExportRequest({ organizationId: "org-1" });
  assertEquals(result instanceof Response, true);
  if (result instanceof Response) {
    assertEquals(result.status, 400);
  }
});

Deno.test("validateSheetsExportRequest rejects invalid filters.dateField", () => {
  const result = validateSheetsExportRequest({
    organizationId: "org-1",
    filters: { dateField: "due_date" },
  });
  assertEquals(result instanceof Response, true);
  if (result instanceof Response) {
    assertEquals(result.status, 400);
  }
});

Deno.test("validateSheetsExportRequest accepts a valid export request", () => {
  const result = validateSheetsExportRequest({
    organizationId: "org-1",
    filters: { dateField: "created_date", status: "open" },
  });
  assertEquals(result instanceof Response, false);
  if (!(result instanceof Response)) {
    assertEquals(result.organizationId, "org-1");
    assertEquals(result.filters.dateField, "created_date");
    assertEquals(result.filters.status, "open");
  }
});

Deno.test("validateSheetsExportRequest allows filters without dateField", () => {
  const result = validateSheetsExportRequest({
    organizationId: "org-1",
    filters: { status: "completed" },
  });
  assertEquals(result instanceof Response, false);
});

const { hasRequiredSheetsExportScopes } = __gwSheetsAuthGateTestables;
const { buildSpreadsheetTitle, resolveSheetNames } = __gwSheetsExportRunTestables;

Deno.test("hasRequiredSheetsExportScopes requires spreadsheets scope", () => {
  assertEquals(hasRequiredSheetsExportScopes(GOOGLE_SCOPES.SPREADSHEETS), true);
  assertEquals(hasRequiredSheetsExportScopes("https://www.googleapis.com/auth/drive"), false);
});

Deno.test("buildSpreadsheetTitle includes ISO date prefix", () => {
  assertEquals(
    buildSpreadsheetTitle(new Date("2026-06-06T12:00:00Z")),
    "Work Orders Export 2026-06-06",
  );
});

Deno.test("resolveSheetNames omits PM sheet when there are no PM rows", () => {
  assertEquals(resolveSheetNames(0).includes(WORKSHEET_NAMES.PM_CHECKLISTS), false);
  assertEquals(resolveSheetNames(3).includes(WORKSHEET_NAMES.PM_CHECKLISTS), true);
});
