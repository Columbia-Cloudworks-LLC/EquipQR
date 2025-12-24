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
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get Tailwind CSS classes for status badge styling
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'accepted':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'assigned':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'on_hold':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get shadcn Badge variant for status
 */
export const getStatusBadgeVariant = (status: WorkOrderStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
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
export const getPriorityBadgeVariant = (priority: WorkOrderPriority): 'default' | 'secondary' | 'outline' | 'destructive' => {
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

/**
 * Format date string for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date with time for display
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return 'Invalid Date';
  }
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

/**
 * Check if a work order can be edited
 */
export const isEditable = (status: WorkOrderStatus): boolean => {
  return !isTerminalStatus(status);
};

/**
 * Get the next valid status transitions for a work order
 */
export const getValidStatusTransitions = (currentStatus: WorkOrderStatus): WorkOrderStatus[] => {
  switch (currentStatus) {
    case 'submitted':
      return ['accepted', 'cancelled'];
    case 'accepted':
      return ['assigned', 'in_progress', 'cancelled'];
    case 'assigned':
      return ['in_progress', 'on_hold', 'cancelled'];
    case 'in_progress':
      return ['on_hold', 'completed', 'cancelled'];
    case 'on_hold':
      return ['in_progress', 'cancelled'];
    case 'completed':
      return ['in_progress']; // Reopen
    case 'cancelled':
      return ['submitted']; // Reopen
    default:
      return [];
  }
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

/**
 * Sort work orders by priority (high first)
 */
export const sortByPriority = <T extends { priority: WorkOrderPriority }>(items: T[]): T[] => {
  return [...items].sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority));
};

// ============================================
// Display Constants
// ============================================

export const STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const PRIORITY_OPTIONS: { value: WorkOrderPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

