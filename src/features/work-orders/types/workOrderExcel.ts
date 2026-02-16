/**
 * Work Order Excel Export Types
 * 
 * Types for multi-worksheet Excel export functionality.
 * Used by both client-side (single WO) and edge function (bulk) exports.
 */

// ============================================
// Filter Types
// ============================================

/**
 * Filters for bulk work order Excel export
 */
export interface WorkOrderExcelFilters {
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
 * Request payload for the export-work-orders-excel edge function
 */
export interface WorkOrderExcelRequest {
  organizationId: string;
  filters: WorkOrderExcelFilters;
}

// ============================================
// Summary Sheet Row Types
// ============================================

/**
 * Row type for the Summary worksheet
 * Master list of work orders with aggregated totals
 */
export interface WorkOrderSummaryRow {
  workOrderId: string;
  title: string;
  description: string;
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

// ============================================
// Labor Detail Sheet Row Types
// ============================================

/**
 * Row type for the Labor Detail worksheet
 * Work order notes with hours worked
 */
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

// ============================================
// Materials & Costs Sheet Row Types
// ============================================

/**
 * Row type for the Materials & Costs worksheet
 * Itemized parts and costs
 */
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

// ============================================
// PM Checklist Sheet Row Types
// ============================================

/**
 * PM condition values (1-5 scale)
 */
export type PMCondition = 1 | 2 | 3 | 4 | 5 | null;

/**
 * Row type for the PM Checklists worksheet
 * Flattened checklist items (one row per item)
 */
export interface PMChecklistRow {
  workOrderId: string;
  workOrderTitle: string;
  equipmentName: string;
  pmStatus: string;
  completedDate: string;
  section: string;
  itemTitle: string;
  condition: PMCondition;
  conditionText: string;
  required: boolean;
  itemNotes: string;
  generalNotes: string;
}

// ============================================
// Timeline Sheet Row Types
// ============================================

/**
 * Row type for the Timeline worksheet
 * Status change history for audit trail
 */
export interface TimelineRow {
  workOrderId: string;
  workOrderTitle: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason: string;
}

// ============================================
// Equipment Sheet Row Types
// ============================================

/**
 * Row type for the Equipment worksheet
 * Unique equipment referenced by work orders
 */
export interface EquipmentRow {
  equipmentId: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: string;
  workOrderCount: number;
  totalLaborHours: number;
  totalMaterialsCost: number;
}

// ============================================
// Aggregated Export Data
// ============================================

/**
 * Complete data structure for Excel export
 * Contains all worksheet data
 */
export interface WorkOrderExcelData {
  workOrders: WorkOrderSummaryRow[];
  laborDetails: LaborDetailRow[];
  materialsCosts: MaterialCostRow[];
  pmChecklists: PMChecklistRow[];
  timeline: TimelineRow[];
  equipment: EquipmentRow[];
}

// ============================================
// Helper Types
// ============================================

/**
 * Map PM condition number to human-readable text
 */
export function getConditionText(condition: PMCondition): string {
  if (condition === null) return 'Not Rated';
  switch (condition) {
    case 1: return 'OK';
    case 2: return 'Adjusted';
    case 3: return 'Recommend Repairs';
    case 4: return 'Requires Immediate Repairs';
    case 5: return 'Unsafe Condition Present';
    default: return 'Unknown';
  }
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

/**
 * Column headers for each worksheet
 */
export const WORKSHEET_HEADERS = {
  SUMMARY: [
    'Work Order ID',
    'Title',
    'Description',
    'Equipment',
    'Serial Number',
    'Location',
    'Status',
    'Priority',
    'Created Date',
    'Due Date',
    'Completed Date',
    'Days Open',
    'Total Labor Hours',
    'Total Material Cost',
    'PM Status',
    'Assignee',
    'Team',
  ],
  LABOR: [
    'Work Order ID',
    'Work Order Title',
    'Date',
    'Technician',
    'Hours Worked',
    'Notes',
    'Has Photos',
    'Photo Count',
  ],
  COSTS: [
    'Work Order ID',
    'Work Order Title',
    'Equipment',
    'Item Description',
    'Quantity',
    'Unit Price',
    'Total Price',
    'From Inventory',
    'Date Added',
    'Added By',
  ],
  PM_CHECKLISTS: [
    'Work Order ID',
    'Work Order Title',
    'Equipment',
    'PM Status',
    'Completed Date',
    'Section',
    'Item Title',
    'Condition',
    'Condition Text',
    'Required',
    'Item Notes',
    'General Notes',
  ],
  TIMELINE: [
    'Work Order ID',
    'Work Order Title',
    'Previous Status',
    'New Status',
    'Changed At',
    'Changed By',
    'Reason',
  ],
  EQUIPMENT: [
    'Equipment ID',
    'Name',
    'Manufacturer',
    'Model',
    'Serial Number',
    'Location',
    'Status',
    'Work Order Count',
    'Total Labor Hours',
    'Total Materials Cost',
  ],
} as const;
