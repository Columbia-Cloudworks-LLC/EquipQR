// Reports Feature Barrel Export
// This file exports the key components from the reports feature

// Types
export type { 
  ReportType, 
  ReportFilters, 
  ExportColumn,
  ExportFilters,
  ExportRequest,
  ReportCardConfig,
} from './types/reports';

// Components
export { default as ReportCharts } from './components/ReportCharts';
export { default as ReportFiltersComponent } from './components/ReportFilters';
export { ColumnSelector } from './components/ColumnSelector';
export { ReportExportDialog } from './components/ReportExportDialog';

// Constants
export { 
  EQUIPMENT_COLUMNS,
  WORK_ORDER_COLUMNS,
  INVENTORY_COLUMNS,
  SCAN_COLUMNS,
  REPORT_CARDS,
  getColumnsForReportType,
  getDefaultColumns,
} from './constants/reportColumns';

// Services
export { 
  exportReport,
  downloadBlob,
  generateExportFilename,
  getReportRecordCount,
} from './services/reportExportService';

// Hooks
export { 
  useReportExport,
  useReportRecordCount,
  useReportExportDialog,
} from './hooks/useReportExport';
