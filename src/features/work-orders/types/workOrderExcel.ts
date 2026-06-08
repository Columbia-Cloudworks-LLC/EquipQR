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
}

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
