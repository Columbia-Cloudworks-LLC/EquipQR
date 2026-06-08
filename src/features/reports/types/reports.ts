/**
 * Report Types - Type definitions for the reports feature
 */

// ============================================
// Report Type Definitions
// ============================================

export type ReportType = 'equipment' | 'work-orders' | 'work-orders-detailed' | 'inventory' | 'scans' | 'kpis' | 'alternate-groups';

// ============================================
// Export Configuration Types
// ============================================

/**
 * ExportColumn - Definition of a column available for export
 */
export interface ExportColumn {
  /** Unique key matching the database/API field */
  key: string;
  /** Human-readable label for the column */
  label: string;
  /** Whether this column is selected by default */
  default: boolean;
  /** Optional description for tooltips */
  description?: string;
}

/**
 * ExportFilters - Filters to apply when exporting data
 * Matches the edge function's expected filter format
 */
export interface ExportFilters {
  status?: string;
  teamId?: string;
  location?: string;
  priority?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

/**
 * ExportRequest - Request payload for the export-report edge function
 */
export interface ExportRequest {
  reportType: ReportType;
  organizationId: string;
  filters: ExportFilters;
  columns: string[];
  format: 'csv';
}

// ============================================
// Report Card Types (for UI)
// ============================================

/**
 * ReportCardConfig - Configuration for report cards on the Reports page
 */
export interface ReportCardConfig {
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  /** Export format: 'csv' or 'excel' */
  format: 'csv' | 'excel';
  /** Number of columns available for export */
  columnCount: number;
}
