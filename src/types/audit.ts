/**
 * Audit Trail Types
 * 
 * Type definitions for the comprehensive audit logging system.
 * Used for regulatory compliance tracking and accountability.
 */

// ============================================
// Entity Type Constants
// ============================================

export const AUDIT_ENTITY_TYPES = {
  EQUIPMENT: 'equipment',
  WORK_ORDER: 'work_order',
  INVENTORY_ITEM: 'inventory_item',
  PREVENTATIVE_MAINTENANCE: 'preventative_maintenance',
  ORGANIZATION_MEMBER: 'organization_member',
  TEAM_MEMBER: 'team_member',
  TEAM: 'team',
  PM_TEMPLATE: 'pm_template',
} as const;

export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[keyof typeof AUDIT_ENTITY_TYPES];

// ============================================
// Action Type Constants
// ============================================

export const AUDIT_ACTIONS = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

// ============================================
// Change Object Types
// ============================================

/**
 * Represents a single field change
 */
export interface AuditFieldChange<T = unknown> {
  old: T | null;
  new: T | null;
}

/**
 * Record of all field changes in an audit entry
 */
export type AuditChanges = Record<string, AuditFieldChange>;

// ============================================
// Audit Log Entry Types
// ============================================

/**
 * Raw audit log entry from the database
 */
export interface AuditLogEntry {
  id: string;
  organization_id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name: string | null;
  action: AuditAction;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  changes: AuditChanges;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Formatted audit log entry for display
 */
export interface FormattedAuditEntry extends AuditLogEntry {
  /** Human-readable action label (e.g., "Created", "Updated", "Deleted") */
  actionLabel: string;
  /** Human-readable entity type label (e.g., "Equipment", "Work Order") */
  entityTypeLabel: string;
  /** Formatted date string */
  formattedDate: string;
  /** Relative time string (e.g., "2 hours ago") */
  relativeTime: string;
  /** Number of fields that changed */
  changeCount: number;
}

// ============================================
// Filter Types
// ============================================

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  /** Filter by entity type */
  entityType?: AuditEntityType | 'all';
  /** Filter by action type */
  action?: AuditAction | 'all';
  /** Filter by actor (user who made the change) */
  actorId?: string;
  /** Start date for date range filter */
  dateFrom?: string;
  /** End date for date range filter */
  dateTo?: string;
  /** Search by entity name or actor name */
  search?: string;
  /** Specific entity ID (for entity history) */
  entityId?: string;
}

/**
 * Pagination options for audit log queries
 */
export interface AuditLogPagination {
  page: number;
  pageSize: number;
}

/**
 * Sort options for audit log queries
 */
export interface AuditLogSort {
  field: 'created_at' | 'entity_type' | 'action' | 'actor_name';
  direction: 'asc' | 'desc';
}

// ============================================
// Query Result Types
// ============================================

/**
 * Result of an audit log query
 */
export interface AuditLogQueryResult {
  data: AuditLogEntry[];
  totalCount: number;
  hasMore: boolean;
}

// ============================================
// Display Helper Types
// ============================================

/**
 * Labels for entity types
 */
export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  equipment: 'Equipment',
  work_order: 'Work Order',
  inventory_item: 'Inventory Item',
  preventative_maintenance: 'PM Checklist',
  organization_member: 'Organization Member',
  team_member: 'Team Member',
  team: 'Team',
  pm_template: 'PM Template',
};

/**
 * Labels for actions
 */
export const ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

/**
 * Field labels for common audit fields
 * Maps database field names to human-readable labels
 */
export const FIELD_LABELS: Record<string, string> = {
  // Equipment fields
  name: 'Name',
  status: 'Status',
  location: 'Location',
  team_id: 'Team',
  warranty_expiration: 'Warranty Expiration',
  working_hours: 'Working Hours',
  last_maintenance: 'Last Maintenance',
  notes: 'Notes',
  image_url: 'Image',
  manufacturer: 'Manufacturer',
  model: 'Model',
  serial_number: 'Serial Number',
  default_pm_template_id: 'PM Template',
  installation_date: 'Installation Date',
  customer_id: 'Customer',
  custom_attributes: 'Custom Attributes',
  last_known_location: 'Last Known Location',

  // Work order fields
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  assignee_id: 'Assignee',
  assignee_name: 'Assignee Name',
  due_date: 'Due Date',
  completed_date: 'Completed Date',
  estimated_hours: 'Estimated Hours',
  equipment_id: 'Equipment',
  
  // Inventory fields
  quantity_on_hand: 'Quantity',
  low_stock_threshold: 'Low Stock Threshold',
  default_unit_cost: 'Unit Cost',
  sku: 'SKU',
  
  // PM fields
  template_id: 'Template',
  completed_at: 'Completed At',
  completed_by: 'Completed By',
  
  // Member fields
  role: 'Role',
  invited_by: 'Invited By',
  user_id: 'User',
};

// ============================================
// CSV Export Types
// ============================================

/**
 * Audit log entry formatted for CSV export
 */
export interface AuditLogCsvRow {
  date: string;
  time: string;
  entityType: string;
  entityName: string;
  action: string;
  changedBy: string;
  changedByEmail: string;
  changesDescription: string;
}

// ============================================
// Component Props Types
// ============================================

/**
 * Props for the HistoryTab component
 */
export interface HistoryTabProps {
  entityType: AuditEntityType;
  entityId: string;
  organizationId: string;
}

/**
 * Props for the AuditLogTable component
 */
export interface AuditLogTableProps {
  organizationId: string;
  filters?: AuditLogFilters;
  onFilterChange?: (filters: AuditLogFilters) => void;
}

/**
 * Props for the ChangesDiff component
 */
export interface ChangesDiffProps {
  changes: AuditChanges;
  expanded?: boolean;
}
