import type { ExportColumn, ReportType, ReportCardConfig } from '@/features/reports/types/reports';

/**
 * Column definitions for Equipment reports
 */
export const EQUIPMENT_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Name', default: true },
  { key: 'manufacturer', label: 'Manufacturer', default: true },
  { key: 'model', label: 'Model', default: true },
  { key: 'serial_number', label: 'Serial Number', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'location', label: 'Location', default: true },
  { key: 'team_name', label: 'Team', default: false },
  { key: 'installation_date', label: 'Installation Date', default: false },
  { key: 'last_maintenance', label: 'Last Maintenance', default: false },
  { key: 'working_hours', label: 'Working Hours', default: false },
  { key: 'warranty_expiration', label: 'Warranty Expiration', default: false },
  { key: 'notes', label: 'Notes', default: false },
  { key: 'created_at', label: 'Created Date', default: false },
  { key: 'url', label: 'Equipment URL', default: false },
  { key: 'custom_attributes', label: 'Custom Attributes', default: false, description: 'Expands to individual columns for each custom attribute' },
];

/**
 * Column definitions for Work Orders reports
 */
export const WORK_ORDER_COLUMNS: ExportColumn[] = [
  { key: 'title', label: 'Title', default: true },
  { key: 'description', label: 'Description', default: false },
  { key: 'status', label: 'Status', default: true },
  { key: 'priority', label: 'Priority', default: true },
  { key: 'assignee_name', label: 'Assignee', default: true },
  { key: 'team_name', label: 'Team', default: true },
  { key: 'equipment_name', label: 'Equipment', default: true },
  { key: 'created_date', label: 'Created Date', default: true },
  { key: 'due_date', label: 'Due Date', default: false },
  { key: 'completed_date', label: 'Completed Date', default: false },
  { key: 'estimated_hours', label: 'Estimated Hours', default: false },
  { key: 'has_pm', label: 'Has PM Checklist', default: false },
];

/**
 * Column definitions for Inventory reports
 */
export const INVENTORY_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Name', default: true },
  { key: 'sku', label: 'SKU', default: true },
  { key: 'external_id', label: 'External ID', default: false },
  { key: 'quantity_on_hand', label: 'Quantity', default: true },
  { key: 'low_stock_threshold', label: 'Low Stock Threshold', default: false },
  { key: 'default_unit_cost', label: 'Unit Cost', default: true },
  { key: 'location', label: 'Location', default: true },
  { key: 'is_low_stock', label: 'Low Stock', default: true },
  { key: 'description', label: 'Description', default: false },
  { key: 'created_at', label: 'Created Date', default: false },
];

/**
 * Column definitions for Scans reports
 */
export const SCAN_COLUMNS: ExportColumn[] = [
  { key: 'equipment_name', label: 'Equipment', default: true },
  { key: 'scanned_by_name', label: 'Scanned By', default: true },
  { key: 'scanned_at', label: 'Scanned At', default: true },
  { key: 'location', label: 'Location', default: true },
  { key: 'notes', label: 'Notes', default: false },
];

/**
 * Column definitions for Alternate Part Groups reports
 */
export const ALTERNATE_GROUPS_COLUMNS: ExportColumn[] = [
  { key: 'group_name', label: 'Group Name', default: true },
  { key: 'group_status', label: 'Verification Status', default: true },
  { key: 'group_description', label: 'Description', default: false },
  { key: 'member_type', label: 'Member Type', default: true },
  { key: 'is_primary', label: 'Primary Part', default: true },
  { key: 'item_name', label: 'Item Name', default: true },
  { key: 'item_sku', label: 'SKU', default: true },
  { key: 'quantity_on_hand', label: 'Quantity', default: true },
  { key: 'is_low_stock', label: 'Low Stock', default: true },
  { key: 'default_unit_cost', label: 'Unit Cost', default: false },
  { key: 'location', label: 'Location', default: false },
  { key: 'identifier_type', label: 'Identifier Type', default: true },
  { key: 'identifier_value', label: 'Part Number', default: true },
  { key: 'identifier_manufacturer', label: 'Part Manufacturer', default: false },
  { key: 'group_notes', label: 'Notes', default: false },
];

/**
 * Get column definitions for a specific report type
 */
export function getColumnsForReportType(reportType: ReportType): ExportColumn[] {
  switch (reportType) {
    case 'equipment':
      return EQUIPMENT_COLUMNS;
    case 'work-orders':
      return WORK_ORDER_COLUMNS;
    case 'inventory':
      return INVENTORY_COLUMNS;
    case 'scans':
      return SCAN_COLUMNS;
    case 'alternate-groups':
      return ALTERNATE_GROUPS_COLUMNS;
    default:
      return [];
  }
}

/**
 * Get default selected columns for a report type
 */
export function getDefaultColumns(reportType: ReportType): string[] {
  const columns = getColumnsForReportType(reportType);
  return columns.filter(col => col.default).map(col => col.key);
}

/**
 * Report card configurations for the Reports page
 */
export const REPORT_CARDS: ReportCardConfig[] = [
  {
    type: 'equipment',
    title: 'Equipment Report',
    description: 'Export your fleet equipment data with custom columns',
    icon: 'Forklift',
    format: 'csv',
    columnCount: EQUIPMENT_COLUMNS.length,
  },
  {
    type: 'work-orders-detailed',
    title: 'Work Orders Report',
    description: 'Multi-sheet Excel with notes, costs, PM checklists, and timeline',
    icon: 'ClipboardList',
    format: 'excel',
    columnCount: WORK_ORDER_COLUMNS.length,
  },
  {
    type: 'inventory',
    title: 'Inventory Report',
    description: 'Export parts inventory with stock levels',
    icon: 'Package',
    format: 'csv',
    columnCount: INVENTORY_COLUMNS.length,
  },
  {
    type: 'scans',
    title: 'Scan Activity Report',
    description: 'Export QR code scan history',
    icon: 'ScanLine',
    format: 'csv',
    columnCount: SCAN_COLUMNS.length,
  },
  {
    type: 'alternate-groups',
    title: 'Alternate Parts Report',
    description: 'Export interchangeable parts groups with cross-references',
    icon: 'Layers',
    format: 'csv',
    columnCount: ALTERNATE_GROUPS_COLUMNS.length,
  },
];
