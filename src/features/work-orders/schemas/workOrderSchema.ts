/**
 * Work Order Form Schemas
 * 
 * Centralized Zod schemas for work order validation.
 * Extract business validation rules from hooks to enable reuse and testing.
 */

import { z } from 'zod';
import { todayServiceDate } from '@/features/work-orders/utils/serviceDate';

// ============================================
// Base Schemas
// ============================================

/**
 * Status enum schema
 */
export const workOrderStatusSchema = z.enum([
  'submitted', 
  'accepted', 
  'assigned', 
  'in_progress', 
  'on_hold', 
  'completed', 
  'cancelled'
]);

export const historicalTimelineEventSchema = z.object({
  newStatus: workOrderStatusSchema,
  changedAt: z.string().min(1),
  reason: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
});

/**
 * Priority enum schema
 */
export const workOrderPrioritySchema = z.enum(['low', 'medium', 'high']);

// ============================================
// Form Schemas
// ============================================

/**
 * Main work order form schema
 * Used for creating and editing work orders
 */
export const workOrderFormSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .default(''),
  equipmentId: z.string()
    .min(1, "Equipment is required"),
  priority: workOrderPrioritySchema,
  dueDate: z.string().optional().nullable(),
  dueDateHasTime: z.boolean().default(false),
  estimatedHours: z.number()
    .min(0, "Estimated hours cannot be negative")
    .max(10000, "Estimated hours seems too high")
    .optional()
    .nullable(),
  equipmentWorkingHours: z.number().min(0, "Hours cannot be negative").optional().nullable(),
  hasPM: z.boolean().default(false),
  pmTemplateId: z.string().optional().nullable(),
  // Simplified assignment: just an assignee ID (null = unassigned)
  assigneeId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  isHistorical: z.boolean().default(false),
  // Historical fields - conditionally required based on isHistorical
  status: workOrderStatusSchema.optional(),
  historicalStartDate: z.date().optional(),
  historicalNotes: z.string().optional(),
  completedDate: z.date().optional().nullable(),
  historicalTimelineEvents: z.array(historicalTimelineEventSchema).optional(),
  /**
   * Log Completed only. False (default) keeps the record "Historical Only / Do Not
   * Sync" so already-billed paper work is never invoiced again in QuickBooks.
   */
  quickBooksSyncReady: z.boolean().default(false),
}).refine(
  (data) => {
    // A work order logged as completed must carry the date the service happened.
    if (data.isHistorical && data.status === 'completed') {
      return data.completedDate instanceof Date && !Number.isNaN(data.completedDate.getTime());
    }
    return true;
  },
  {
    message: "Completed / service date is required",
    path: ["completedDate"]
  }
).refine(
  (data) => {
    if (data.isHistorical && data.status === 'completed' && data.completedDate instanceof Date) {
      return data.completedDate.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
    }
    return true;
  },
  {
    message: "Completed / service date cannot be in the future",
    path: ["completedDate"]
  }
).refine(
  (data) => {
    // If it's historical, require status field
    if (data.isHistorical) {
      return data.status !== undefined;
    }
    return true;
  },
  {
    message: "Status is required for historical work orders",
    path: ["status"]
  }
);

export type WorkOrderFormData = z.infer<typeof workOrderFormSchema>;

// ============================================
// Default Values
// ============================================

/**
 * Get default form values
 */
export const getDefaultWorkOrderFormValues = (
  options: {
    equipmentId?: string;
    isHistorical?: boolean;
  } = {}
): Partial<WorkOrderFormData> => ({
  title: '',
  description: '',
  equipmentId: options.equipmentId || '',
  priority: 'medium',
  dueDate: undefined,
  dueDateHasTime: false,
  estimatedHours: undefined,
  hasPM: false,
  pmTemplateId: null,
  // Simplified assignment: null = unassigned
  assigneeId: null,
  isHistorical: options.isHistorical || false,
  // Historical entry is "Log Completed": finished work, dated today by default.
  status: options.isHistorical ? 'completed' : undefined,
  historicalStartDate: options.isHistorical ? todayServiceDate() : undefined,
  historicalNotes: '',
  completedDate: options.isHistorical ? todayServiceDate() : undefined,
  historicalTimelineEvents: undefined,
  quickBooksSyncReady: false,
});

