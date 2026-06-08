/**
 * Status Color Utilities
 *
 * Provides consistent status-based color classes for work orders, equipment,
 * and other entities throughout the application.
 */

const BORDER_LEFT = 'border-l-4 ';

const lookupBorderClass = (status: string, tokens: Record<string, string>): string => {
  const key = status?.toLowerCase() ?? '';
  return BORDER_LEFT + (tokens[key] ?? 'border-l-muted');
};

const WORK_ORDER_STATUS_BORDER: Record<string, string> = {
  open: 'border-l-status-open',
  assigned: 'border-l-status-assigned',
  in_progress: 'border-l-status-in-progress',
  'in-progress': 'border-l-status-in-progress',
  completed: 'border-l-status-completed',
  cancelled: 'border-l-status-cancelled',
  canceled: 'border-l-status-cancelled',
};

const EQUIPMENT_STATUS_BORDER: Record<string, string> = {
  maintenance: 'border-l-equipment-maintenance',
  repair: 'border-l-equipment-repair',
  broken: 'border-l-equipment-repair',
  out_of_service: 'border-l-equipment-repair',
  retired: 'border-l-equipment-retired',
  inactive: 'border-l-equipment-retired',
};

/** Fill classes for card left rails (avoids Card border-color overrides). */
const EQUIPMENT_STATUS_RAIL: Record<string, string> = {
  maintenance: 'bg-equipment-maintenance',
  repair: 'bg-equipment-repair',
  broken: 'bg-equipment-repair',
  out_of_service: 'bg-equipment-repair',
  retired: 'bg-equipment-retired',
  inactive: 'bg-equipment-retired',
};

/** Card rail legend entries for equipment list filter UI (active = no rail). */
export const EQUIPMENT_STATUS_RAIL_LEGEND = [
  { status: 'active', label: 'Active', railClass: '' },
  { status: 'maintenance', label: 'Maintenance', railClass: 'bg-equipment-maintenance' },
  { status: 'inactive', label: 'Inactive', railClass: 'bg-equipment-retired' },
  { status: 'out_of_service', label: 'Out of Service', railClass: 'bg-equipment-repair' },
] as const;

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-priority-low/10 text-priority-low border-priority-low',
  medium: 'bg-priority-medium/10 text-priority-medium border-priority-medium',
  high: 'bg-priority-high/10 text-priority-high border-priority-high',
  critical: 'bg-priority-critical/10 text-priority-critical border-priority-critical',
  urgent: 'bg-priority-critical/10 text-priority-critical border-priority-critical',
};

const STATUS_BACKGROUND_TINT: Record<string, string> = {
  in_progress: 'bg-status-in-progress/[0.03]',
  'in-progress': 'bg-status-in-progress/[0.03]',
  on_hold: 'bg-warning/[0.03]',
  submitted: 'bg-info/[0.03]',
  accepted: 'bg-primary/[0.03]',
  assigned: 'bg-primary/[0.03]',
};

const getWorkOrderStatusBorderClass = (status: string): string =>
  lookupBorderClass(status, WORK_ORDER_STATUS_BORDER);

// Work Order Status with Overdue Check
export const getWorkOrderStatusBorderWithOverdue = (
  status: string,
  isOverdue: boolean
): string => {
  if (isOverdue && status?.toLowerCase() !== 'completed') {
    return `${BORDER_LEFT}border-l-status-overdue`;
  }
  return getWorkOrderStatusBorderClass(status);
};

// Equipment Status Border Colors — active/operational cards use no left rail
export const getEquipmentStatusBorderClass = (status: string): string => {
  const key = status?.toLowerCase() ?? '';
  if (key === 'active' || key === 'operational') return '';
  return lookupBorderClass(status, EQUIPMENT_STATUS_BORDER);
};

/** Colored fill for equipment card left rail (use on an inner strip, not border-left). */
export const getEquipmentStatusRailClass = (status: string): string => {
  const key = status?.toLowerCase() ?? '';
  if (key === 'active' || key === 'operational') return '';
  return EQUIPMENT_STATUS_RAIL[key] ?? 'bg-muted';
};

const EQUIPMENT_STATUS_TINT: Record<string, string> = {
  maintenance: 'bg-equipment-maintenance/[0.03]',
  repair: 'bg-equipment-repair/[0.03]',
  broken: 'bg-equipment-repair/[0.03]',
  out_of_service: 'bg-equipment-repair/[0.03]',
  retired: 'bg-equipment-retired/[0.03]',
  inactive: 'bg-equipment-retired/[0.03]',
};

export const getEquipmentStatusBackgroundTint = (status: string): string => {
  const key = status?.toLowerCase() ?? '';
  if (key === 'active' || key === 'operational') return '';
  return EQUIPMENT_STATUS_TINT[key] ?? '';
};

// Work Order Status Background Tints (subtle card fills for active states)
export const getStatusBackgroundTint = (status: string, isOverdue: boolean): string => {
  if (isOverdue && status?.toLowerCase() !== 'completed') {
    return 'bg-destructive/[0.03]';
  }
  const key = status?.toLowerCase() ?? '';
  return STATUS_BACKGROUND_TINT[key] ?? '';
};

// Priority Badge Colors
export const getPriorityBadgeClass = (priority: string): string => {
  const key = priority?.toLowerCase() ?? '';
  return PRIORITY_BADGE[key] ?? 'bg-muted text-muted-foreground';
};
