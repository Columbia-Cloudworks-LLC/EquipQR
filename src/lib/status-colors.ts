/**
 * Status Color Utilities
 * 
 * Provides consistent status-based color classes for work orders, equipment,
 * and other entities throughout the application.
 */

// Work Order Status Border Colors
const getWorkOrderStatusBorderClass = (status: string): string => {
  const statusLower = status?.toLowerCase() ?? '';
  
  switch (statusLower) {
    case 'open':
      return 'border-l-4 border-l-status-open';
    case 'assigned':
      return 'border-l-4 border-l-status-assigned';
    case 'in_progress':
    case 'in-progress':
      return 'border-l-4 border-l-status-in-progress';
    case 'completed':
      return 'border-l-4 border-l-status-completed';
    case 'cancelled':
    case 'canceled':
      return 'border-l-4 border-l-status-cancelled';
    default:
      return 'border-l-4 border-l-muted';
  }
};

// Work Order Status with Overdue Check
export const getWorkOrderStatusBorderWithOverdue = (
  status: string, 
  isOverdue: boolean
): string => {
  if (isOverdue && status?.toLowerCase() !== 'completed') {
    return 'border-l-4 border-l-status-overdue';
  }
  return getWorkOrderStatusBorderClass(status);
};

// Equipment Status Border Colors
export const getEquipmentStatusBorderClass = (status: string): string => {
  const statusLower = status?.toLowerCase() ?? '';
  
  switch (statusLower) {
    case 'active':
    case 'operational':
      return 'border-l-4 border-l-equipment-operational';
    case 'maintenance':
      return 'border-l-4 border-l-equipment-maintenance';
    case 'repair':
    case 'broken':
    case 'out_of_service':
      return 'border-l-4 border-l-equipment-repair';
    case 'retired':
    case 'inactive':
      return 'border-l-4 border-l-equipment-retired';
    default:
      return 'border-l-4 border-l-muted';
  }
};

// Work Order Status Background Tints (subtle card fills for active states)
export const getStatusBackgroundTint = (status: string, isOverdue: boolean): string => {
  if (isOverdue && status?.toLowerCase() !== 'completed') {
    return 'bg-destructive/[0.03]';
  }
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'in-progress':
      return 'bg-status-in-progress/[0.03]';
    case 'on_hold':
      return 'bg-warning/[0.03]';
    case 'submitted':
      return 'bg-info/[0.03]';
    case 'accepted':
    case 'assigned':
      return 'bg-primary/[0.03]';
    default:
      return '';
  }
};

// Priority Badge Colors
export const getPriorityBadgeClass = (priority: string): string => {
  const priorityLower = priority?.toLowerCase() ?? '';
  
  switch (priorityLower) {
    case 'low':
      return 'bg-priority-low/10 text-priority-low border-priority-low';
    case 'medium':
      return 'bg-priority-medium/10 text-priority-medium border-priority-medium';
    case 'high':
      return 'bg-priority-high/10 text-priority-high border-priority-high';
    case 'critical':
    case 'urgent':
      return 'bg-priority-critical/10 text-priority-critical border-priority-critical';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

