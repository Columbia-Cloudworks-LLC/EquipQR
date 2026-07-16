/**
 * Shared Work Orders Export Data Module
 *
 * Public contract: types, worksheet metadata, rate limiting, and re-exports
 * from fetch/row builders.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export { fetchWorkOrdersWithData } from "./work-orders-export-fetch.ts";

export {
  buildAllRows,
  summaryRowToArray,
  laborRowToArray,
  costRowToArray,
  pmRowToArray,
  timelineRowToArray,
  equipmentRowToArray,
} from "./work-orders-export-rows.ts";

export {
  formatDate,
  formatDateTime,
  getConditionText,
  calculateDaysOpen,
  truncateId,
} from "./export-formatters.ts";

// ============================================
// Types
// ============================================

export type WorksheetKey =
  | "SUMMARY"
  | "LABOR"
  | "COSTS"
  | "PM_CHECKLISTS"
  | "TIMELINE"
  | "EQUIPMENT";

export const WORKSHEET_KEYS: readonly WorksheetKey[] = [
  "SUMMARY",
  "LABOR",
  "COSTS",
  "PM_CHECKLISTS",
  "TIMELINE",
  "EQUIPMENT",
];

const WORKSHEET_KEY_SET = new Set<string>(WORKSHEET_KEYS);

export type WorksheetSelectionResult =
  | { ok: true; worksheets: WorksheetKey[] | undefined }
  | { ok: false };

/** Validates request worksheet keys; empty array means export all default sheets. */
export function parseWorksheetSelection(worksheets: unknown): WorksheetSelectionResult {
  if (worksheets == null) {
    return { ok: true, worksheets: undefined };
  }
  if (!Array.isArray(worksheets)) {
    return { ok: false };
  }
  if (worksheets.length === 0) {
    return { ok: true, worksheets: undefined };
  }

  const valid = worksheets.filter(
    (value): value is WorksheetKey =>
      typeof value === "string" && WORKSHEET_KEY_SET.has(value),
  );

  if (valid.length !== worksheets.length) {
    return { ok: false };
  }

  return { ok: true, worksheets: valid };
}

export interface WorkOrderExcelFilters {
  workOrderId?: string;
  status?: string;
  teamId?: string;
  priority?: string;
  assigneeId?: string;
  dateField: "created_date" | "completed_date";
  dateRange?: {
    from?: string;
    to?: string;
  };
  worksheets?: WorksheetKey[];
}

export interface ExportRequest {
  organizationId: string;
  filters: WorkOrderExcelFilters;
}

export interface WorkOrderSummaryRow {
  workOrderId: string;
  title: string;
  description: string;
  customerName: string;
  equipmentName: string;
  equipmentSerialNumber: string;
  equipmentLocation: string;
  status: string;
  priority: string;
  createdDate: string;
  dueDate: string;
  completedDate: string;
  daysOpen: number | null;
  totalLaborHours: number;
  totalMaterialCost: number;
  pmStatus: string;
  assignee: string;
  team: string;
}

export interface LaborDetailRow {
  workOrderId: string;
  workOrderTitle: string;
  date: string;
  technician: string;
  hoursWorked: number;
  notes: string;
  hasPhotos: boolean;
  photoCount: number;
}

export interface MaterialCostRow {
  workOrderId: string;
  workOrderTitle: string;
  equipmentName: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fromInventory: boolean;
  dateAdded: string;
  addedBy: string;
}

export interface PMChecklistRow {
  workOrderId: string;
  workOrderTitle: string;
  equipmentName: string;
  pmStatus: string;
  completedDate: string;
  section: string;
  itemTitle: string;
  condition: number | null;
  conditionText: string;
  required: boolean;
  itemNotes: string;
  generalNotes: string;
}

export interface TimelineRow {
  workOrderId: string;
  workOrderTitle: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export interface EquipmentRow {
  equipmentId: string;
  name: string;
  customerName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: string;
  workOrderCount: number;
  totalLaborHours: number;
  totalMaterialsCost: number;
}

export interface AllExportRows {
  summaryRows: WorkOrderSummaryRow[];
  laborRows: LaborDetailRow[];
  costRows: MaterialCostRow[];
  pmRows: PMChecklistRow[];
  timelineRows: TimelineRow[];
  equipmentRows: EquipmentRow[];
}

// ============================================
// Worksheet Configuration
// ============================================

export const WORKSHEET_NAMES = {
  SUMMARY: "Summary",
  LABOR: "Labor Detail",
  COSTS: "Materials & Costs",
  PM_CHECKLISTS: "PM Checklists",
  TIMELINE: "Timeline",
  EQUIPMENT: "Equipment",
} as const;

export const WORKSHEET_HEADERS = {
  SUMMARY: [
    "Work Order ID", "Title", "Description", "Customer", "Equipment", "Serial Number",
    "Location", "Status", "Priority", "Created Date", "Due Date",
    "Completed Date", "Days Open", "Total Labor Hours", "Total Material Cost",
    "PM Status", "Assignee", "Team",
  ],
  LABOR: [
    "Work Order ID", "Work Order Title", "Date", "Technician",
    "Hours Worked", "Notes", "Has Photos", "Photo Count",
  ],
  COSTS: [
    "Work Order ID", "Work Order Title", "Equipment", "Item Description",
    "Quantity", "Unit Price", "Total Price", "From Inventory", "Date Added", "Added By",
  ],
  PM_CHECKLISTS: [
    "Work Order ID", "Work Order Title", "Equipment", "PM Status",
    "Completed Date", "Section", "Item Title", "Condition", "Condition Text",
    "Required", "Item Notes", "General Notes",
  ],
  TIMELINE: [
    "Work Order ID", "Work Order Title", "Previous Status", "New Status",
    "Changed At", "Changed By", "Reason",
  ],
  EQUIPMENT: [
    "Equipment ID", "Name", "Customer", "Manufacturer", "Model", "Serial Number",
    "Location", "Status", "Work Order Count", "Total Labor Hours", "Total Materials Cost",
  ],
} as const;

// ============================================
// Rate Limiting
// ============================================

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { error: tableCheckError } = await supabase
    .from("export_request_log")
    .select("id")
    .limit(1);

  if (tableCheckError) {
    if (tableCheckError.message?.includes("relation") && tableCheckError.message?.includes("does not exist")) {
      console.log("export_request_log table not found, skipping rate limit check");
      return true;
    }
    throw new Error(`Rate limit check failed unexpectedly: ${tableCheckError.message}`);
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: userCount } = await supabase
    .from("export_request_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("requested_at", oneMinuteAgo);

  if ((userCount ?? 0) >= 5) return false;

  const { count: orgCount } = await supabase
    .from("export_request_log")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("requested_at", oneHourAgo);

  if ((orgCount ?? 0) >= 50) return false;

  return true;
}

export function createWorkOrderExportRateLimitResponse(
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please wait before requesting another export.",
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
