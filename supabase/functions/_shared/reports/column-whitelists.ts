/**
 * Server-side column whitelists for Fleet Export Console reports (#1192).
 *
 * Keys align with `src/features/reports/constants/reportColumns.ts` so client
 * selections map to auditable server-side fetches.
 */

import type { FleetReportType } from "./types.ts";

/** Approved export column keys per report type. */
export const REPORT_COLUMN_WHITELISTS: Record<FleetReportType, readonly string[]> = {
  equipment: [
    "name",
    "manufacturer",
    "model",
    "serial_number",
    "status",
    "location",
    "team_name",
    "installation_date",
    "last_maintenance",
    "working_hours",
    "warranty_expiration",
    "notes",
    "created_at",
    "url",
    "custom_attributes",
  ],
  "work-orders": [
    "title",
    "description",
    "status",
    "priority",
    "assignee_name",
    "team_name",
    "equipment_name",
    "created_date",
    "due_date",
    "completed_date",
    "estimated_hours",
    "has_pm",
  ],
  inventory: [
    "name",
    "sku",
    "external_id",
    "quantity_on_hand",
    "low_stock_threshold",
    "default_unit_cost",
    "location",
    "is_low_stock",
    "description",
    "created_at",
  ],
  scans: [
    "equipment_name",
    "scanned_by_name",
    "scanned_at",
    "location",
    "notes",
  ],
  "operator-check-ins": [
    "equipment_name",
    "template_name",
    "serial_number",
    "submitted_at",
    "captured_fields_summary",
    "is_complete",
    "checklist_summary",
    "captured_fields_json",
    "checklist_answers_json",
  ],
  "quick-forms": [
    "form_name",
    "submitted_at",
    "captured_fields_summary",
    "timezone",
    "gps",
    "field_values_json",
    "submission_id",
  ],
  "alternate-groups": [
    "group_name",
    "group_status",
    "group_description",
    "member_type",
    "is_primary",
    "item_name",
    "item_sku",
    "quantity_on_hand",
    "is_low_stock",
    "default_unit_cost",
    "location",
    "identifier_type",
    "identifier_value",
    "identifier_manufacturer",
    "group_notes",
  ],
};

const INVENTORY_LABELS: Record<string, string> = {
  name: "Name",
  description: "Description",
  sku: "SKU",
  external_id: "External ID",
  quantity_on_hand: "Quantity",
  low_stock_threshold: "Low Stock Threshold",
  default_unit_cost: "Unit Cost",
  location: "Location",
  is_low_stock: "Low Stock",
  created_at: "Created Date",
};

const SCAN_LABELS: Record<string, string> = {
  equipment_name: "Equipment",
  scanned_by_name: "Scanned By",
  scanned_at: "Scanned At",
  location: "Location",
  notes: "Notes",
};

const OPERATOR_CHECKIN_LABELS: Record<string, string> = {
  equipment_name: "Equipment",
  template_name: "Checklist",
  serial_number: "Unit #",
  submitted_at: "Submitted At",
  captured_fields_summary: "Captured Fields",
  captured_fields_json: "Captured Fields (JSON)",
  is_complete: "Complete",
  checklist_summary: "Required Items Answered",
  checklist_answers_json: "Checklist Answers (JSON)",
};

const QUICK_FORM_LABELS: Record<string, string> = {
  form_name: "Form",
  submitted_at: "Submitted At",
  captured_fields_summary: "Captured Fields",
  timezone: "Timezone",
  gps: "GPS",
  field_values_json: "Field Values (JSON)",
  submission_id: "Submission ID",
};

const ALTERNATE_GROUP_LABELS: Record<string, string> = {
  group_name: "Group Name",
  group_status: "Verification Status",
  group_description: "Description",
  member_type: "Member Type",
  is_primary: "Primary Part",
  item_name: "Item Name",
  item_sku: "SKU",
  quantity_on_hand: "Quantity",
  is_low_stock: "Low Stock",
  default_unit_cost: "Unit Cost",
  location: "Location",
  identifier_type: "Identifier Type",
  identifier_value: "Part Number",
  identifier_manufacturer: "Part Manufacturer",
  group_notes: "Notes",
};

export const REPORT_COLUMN_LABELS: Record<FleetReportType, Record<string, string>> = {
  equipment: {},
  "work-orders": {},
  inventory: INVENTORY_LABELS,
  scans: SCAN_LABELS,
  "operator-check-ins": OPERATOR_CHECKIN_LABELS,
  "quick-forms": QUICK_FORM_LABELS,
  "alternate-groups": ALTERNATE_GROUP_LABELS,
};

/**
 * Keep only columns the server allows for this report type.
 * `custom_attributes` is permitted for equipment exports only.
 */
export function filterAllowedColumns(
  reportType: FleetReportType,
  columns: string[],
): string[] {
  const whitelist = new Set(REPORT_COLUMN_WHITELISTS[reportType]);
  return columns.filter((col) => whitelist.has(col));
}
