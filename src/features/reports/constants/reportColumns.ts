import type {
  ExportColumn,
  ReportType,
  ReportCardConfig,
  ReportCategory,
} from '@/features/reports/types/reports';
import { REPORT_CATEGORY_LABELS } from '@/features/reports/types/reports';

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

export const OPERATOR_CHECKIN_COLUMNS: ExportColumn[] = [
  { key: 'equipment_name', label: 'Equipment', default: true },
  { key: 'template_name', label: 'Checklist', default: true },
  { key: 'serial_number', label: 'Unit #', default: false },
  { key: 'submitted_at', label: 'Submitted At', default: true },
  { key: 'captured_fields_summary', label: 'Captured Fields', default: true },
  { key: 'is_complete', label: 'Complete', default: true },
  { key: 'checklist_summary', label: 'Required Items Answered', default: true },
  { key: 'captured_fields_json', label: 'Captured Fields (JSON)', default: false },
  { key: 'checklist_answers_json', label: 'Checklist Answers (JSON)', default: false },
];

export const QUICK_FORM_COLUMNS: ExportColumn[] = [
  { key: 'form_name', label: 'Form', default: true },
  { key: 'submitted_at', label: 'Submitted At', default: true },
  { key: 'captured_fields_summary', label: 'Captured Fields', default: true },
  { key: 'timezone', label: 'Timezone', default: false },
  { key: 'gps', label: 'GPS', default: false },
  { key: 'field_values_json', label: 'Field Values (JSON)', default: false },
  { key: 'submission_id', label: 'Submission ID', default: false },
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
    case 'operator-check-ins':
      return OPERATOR_CHECKIN_COLUMNS;
    case 'quick-forms':
      return QUICK_FORM_COLUMNS;
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
    title: 'Fleet Asset Register',
    description: 'Export fleet equipment records with customizable columns for audits and asset tracking',
    icon: 'Forklift',
    format: 'csv',
    columnCount: EQUIPMENT_COLUMNS.length,
    category: 'fleet-assets',
    previewFields: ['Status', 'Location', 'Warranty', 'Working Hours'],
  },
  {
    type: 'work-orders-detailed',
    title: 'Internal Work Order Packet',
    description: 'Operational multi-sheet workbook with labor, costs, PM checklists, and timeline',
    icon: 'ClipboardList',
    format: 'excel',
    columnCount: WORK_ORDER_COLUMNS.length,
    category: 'maintenance-operations',
    previewFields: ['Labor', 'Costs', 'PM Checklist', 'Timeline'],
    featured: true,
  },
  {
    type: 'work-orders',
    title: 'Work Order Summary',
    description: 'Download CSV summaries for work orders on equipment you can view',
    icon: 'ClipboardList',
    format: 'csv',
    columnCount: WORK_ORDER_COLUMNS.length,
    category: 'maintenance-operations',
    previewFields: ['Status', 'Priority', 'Equipment', 'Completed Date'],
    scopedAudienceOnly: true,
  },
  {
    type: 'inventory',
    title: 'Parts Inventory Snapshot',
    description: 'Export parts inventory with stock levels, locations, and low-stock indicators',
    icon: 'Package',
    format: 'csv',
    columnCount: INVENTORY_COLUMNS.length,
    category: 'inventory-parts',
    previewFields: ['SKU', 'Quantity', 'Low Stock', 'Unit Cost'],
  },
  {
    type: 'scans',
    title: 'QR Scan Evidence Log',
    description: 'Export QR code scan history for field activity and compliance review',
    icon: 'ScanLine',
    format: 'csv',
    columnCount: SCAN_COLUMNS.length,
    category: 'scan-evidence',
    previewFields: ['Equipment', 'Scanned By', 'Timestamp', 'Location'],
  },
  {
    type: 'operator-check-ins',
    title: 'Operator Daily Check-In Ledger',
    description: 'Export unauthenticated operator safety check-ins with configured captured fields and checklist answers',
    icon: 'ClipboardSignature',
    format: 'csv',
    columnCount: OPERATOR_CHECKIN_COLUMNS.length,
    category: 'scan-evidence',
    previewFields: ['Captured Fields', 'Unit #', 'Submitted At', 'Complete'],
  },
  {
    type: 'quick-forms',
    title: 'Quick Form Submission Ledger',
    description: 'Export unauthenticated quick form responses with configured captured fields and optional location context',
    icon: 'FileSignature',
    format: 'csv',
    columnCount: QUICK_FORM_COLUMNS.length,
    category: 'scan-evidence',
    previewFields: ['Form', 'Captured Fields', 'Submitted At', 'GPS'],
  },
  {
    type: 'alternate-groups',
    title: 'Alternate Parts Cross-Reference',
    description: 'Export interchangeable parts groups with cross-references and verification status',
    icon: 'Layers',
    format: 'csv',
    columnCount: ALTERNATE_GROUPS_COLUMNS.length,
    category: 'inventory-parts',
    previewFields: ['Group Name', 'Primary Part', 'Cross-Ref', 'Verification'],
  },
];

/** Featured report card (hero module) */
export const FEATURED_REPORT_CARD = REPORT_CARDS.find((c) => c.featured);

export function getReportCardsForAudience(audience: 'admin' | 'scoped'): ReportCardConfig[] {
  if (audience === 'scoped') {
    return REPORT_CARDS.filter((card) => card.scopedAudienceOnly);
  }
  return REPORT_CARDS.filter((card) => !card.scopedAudienceOnly);
}

/** Secondary report cards grouped by mission area */
export function getReportsByCategory(audience: 'admin' | 'scoped' = 'admin'): { category: ReportCategory; label: string; cards: ReportCardConfig[] }[] {
  const cards = getReportCardsForAudience(audience);
  const secondary = cards.filter((c) => !c.featured);
  const order: ReportCategory[] = [
    'fleet-assets',
    'maintenance-operations',
    'inventory-parts',
    'scan-evidence',
  ];

  return order
    .map((category) => ({
      category,
      label: REPORT_CATEGORY_LABELS[category],
      cards: secondary.filter((c) => c.category === category),
    }))
    .filter((group) => group.cards.length > 0);
}
