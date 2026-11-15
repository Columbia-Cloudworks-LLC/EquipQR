/**
 * Work Order Presentation Helpers
 * 
 * Centralized utility functions for work order UI presentation.
 * All components should import from here instead of defining locally.
 */

import type { WorkOrderStatus, WorkOrderPriority } from '@/features/work-orders/types/workOrder';

// ============================================
// Color Utilities
// ============================================

/**
 * Get Tailwind CSS classes for priority badge styling
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'medium':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'low':
      return 'bg-success/20 text-success border-success/30';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

/**
 * Get Tailwind CSS classes for status badge styling
 */
export const getWorkOrderStatusColor = (status: string): string => {
  switch (status) {
    case 'submitted':
      return 'bg-info/20 text-info border-info/30';
    case 'accepted':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'assigned':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'in_progress':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'on_hold':
      return 'bg-muted text-foreground border-border';
    case 'completed':
      return 'bg-success/20 text-success border-success/30';
    case 'cancelled':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

/**
 * Text-only status color for detail views (no badge chrome).
 */
export const getWorkOrderStatusTextColor = (status: string): string => {
  switch (status) {
    case 'submitted':
      return 'text-info';
    case 'accepted':
      return 'text-primary';
    case 'assigned':
    case 'in_progress':
      return 'text-warning';
    case 'on_hold':
      return 'text-muted-foreground';
    case 'completed':
      return 'text-success';
    case 'cancelled':
      return 'text-destructive';
    default:
      return 'text-foreground';
  }
};

/**
 * Text-only priority color for detail views (no badge chrome).
 */
export const getPriorityTextColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
};

/**
 * Get shadcn Badge variant for status
 */
const getStatusBadgeVariant = (status: WorkOrderStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'submitted':
    case 'accepted':
    case 'assigned':
    case 'on_hold':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

/**
 * Get shadcn Badge variant for priority
 */
const getPriorityBadgeVariant = (priority: WorkOrderPriority): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
};

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format status string for display (snake_case to Title Case)
 */
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Format priority string for display
 */
export const formatPriority = (priority: string): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};


// ============================================
// Status Logic Utilities
// ============================================

/**
 * Check if a work order is overdue
 */
export const isOverdue = (dueDate: string | null | undefined, status: WorkOrderStatus): boolean => {
  if (!dueDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  
  const now = new Date();
  const due = new Date(dueDate);
  return due < now;
};

/**
 * Check if a work order is in a terminal state
 */
export const isTerminalStatus = (status: WorkOrderStatus): boolean => {
  return status === 'completed' || status === 'cancelled';
};

// ============================================
// Priority Logic Utilities
// ============================================

/**
 * Get priority numeric value for sorting
 */
export const getPriorityValue = (priority: WorkOrderPriority): number => {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
};

// ============================================
// Custom Attribute Formatting
// ============================================

const UNIT_ABBREVIATIONS = new Set([
  'hp', 'kw', 'rpm', 'psi', 'mph', 'kph', 'lb', 'lbs', 'kg',
  'ft', 'in', 'mm', 'cm', 'm', 'gal', 'l', 'qt', 'oz',
]);

/**
 * Convert a snake_case or underscore-delimited key to a human-readable label.
 * e.g. "engine_power" -> "Engine Power"
 */
export const humanizeAttributeKey = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Convert a raw attribute value to a human-readable format.
 * Handles underscore-delimited values with known unit suffixes.
 * e.g. "160_hp" -> "160 HP", "1.2_cubic_yards" -> "1.2 Cubic Yards"
 */
export const humanizeAttributeValue = (value: unknown): string => {
  const str = String(value);
  const parts = str.split('_');
  if (parts.length <= 1) return str;

  return parts
    .map(part => {
      if (UNIT_ABBREVIATIONS.has(part.toLowerCase())) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};
