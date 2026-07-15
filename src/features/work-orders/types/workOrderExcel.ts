/**
 * Work Order Excel Export Types
 *
 * Client-side filter and worksheet metadata for Excel export flows.
 * Row shapes and sheet builders live in Supabase edge functions.
 */

// ============================================
// Filter Types
// ============================================

/**
 * Worksheet names for the Excel export
 */
export const WORKSHEET_NAMES = {
  SUMMARY: 'Summary',
  LABOR: 'Labor Detail',
  COSTS: 'Materials & Costs',
  PM_CHECKLISTS: 'PM Checklists',
  TIMELINE: 'Timeline',
  EQUIPMENT: 'Equipment',
} as const;

export type WorksheetKey = keyof typeof WORKSHEET_NAMES;

export const ALL_WORKSHEET_KEYS: WorksheetKey[] = Object.keys(WORKSHEET_NAMES) as WorksheetKey[];

export const DEFAULT_WORKSHEETS: WorksheetKey[] = [...ALL_WORKSHEET_KEYS];

/**
 * Filters for bulk work order Excel export
 */
export interface WorkOrderExcelFilters {
  /** Optional direct export by work order ID (used for single work order internal packet exports) */
  workOrderId?: string;
  status?: string;
  teamId?: string;
  priority?: string;
  assigneeId?: string;
  /** Which date field to filter on */
  dateField: 'created_date' | 'completed_date';
  dateRange?: {
    from?: string;
    to?: string;
  };
  /** Worksheets to include; defaults to all when omitted */
  worksheets?: WorksheetKey[];
}
