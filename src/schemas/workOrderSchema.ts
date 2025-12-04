/**
 * Work Order Form Schemas
 * 
 * Centralized Zod schemas for work order validation.
 * Extract business validation rules from hooks to enable reuse and testing.
 */

import { z } from 'zod';
import type { WorkOrderStatus, WorkOrderPriority } from '@/types/workOrder';

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
    .min(1, "Description is required")
    .max(1000, "Description must be less than 1000 characters"),
  equipmentId: z.string()
    .min(1, "Equipment is required"),
  priority: workOrderPrioritySchema,
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number()
    .min(0, "Estimated hours cannot be negative")
    .max(10000, "Estimated hours seems too high")
    .optional()
    .nullable(),
  equipmentWorkingHours: z.number().optional().nullable(),
  hasPM: z.boolean().default(false),
  pmTemplateId: z.string().optional().nullable(),
  assignmentType: z.enum(['unassigned', 'user', 'team']).optional(),
  assignmentId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  isHistorical: z.boolean().default(false),
  // Historical fields - conditionally required based on isHistorical
  status: workOrderStatusSchema.optional(),
  historicalStartDate: z.date().optional(),
  historicalNotes: z.string().optional(),
  completedDate: z.date().optional().nullable(),
}).refine(
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

/**
 * Schema for quick status update
 */
export const workOrderStatusUpdateSchema = z.object({
  workOrderId: z.string().uuid(),
  status: workOrderStatusSchema,
  organizationId: z.string().uuid()
});

export type WorkOrderStatusUpdateData = z.infer<typeof workOrderStatusUpdateSchema>;

/**
 * Schema for work order assignment
 */
export const workOrderAssignmentSchema = z.object({
  workOrderId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
  organizationId: z.string().uuid()
});

export type WorkOrderAssignmentData = z.infer<typeof workOrderAssignmentSchema>;

/**
 * Schema for work order note creation
 */
export const workOrderNoteSchema = z.object({
  content: z.string()
    .min(1, "Note content is required")
    .max(5000, "Note must be less than 5000 characters"),
  hoursWorked: z.number()
    .min(0, "Hours worked cannot be negative")
    .max(1000, "Hours worked seems too high")
    .optional()
    .default(0),
  isPrivate: z.boolean().default(false)
});

export type WorkOrderNoteData = z.infer<typeof workOrderNoteSchema>;

/**
 * Schema for work order cost entry
 */
export const workOrderCostSchema = z.object({
  description: z.string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  amount: z.number()
    .min(0, "Amount cannot be negative"),
  category: z.enum(['labor', 'parts', 'other']).default('other'),
  quantity: z.number()
    .min(1, "Quantity must be at least 1")
    .default(1)
});

export type WorkOrderCostData = z.infer<typeof workOrderCostSchema>;

// ============================================
// Filter Schemas
// ============================================

/**
 * Schema for work order list filters
 */
export const workOrderFiltersSchema = z.object({
  searchQuery: z.string().default(''),
  statusFilter: z.string().default('all'),
  assigneeFilter: z.string().default('all'),
  teamFilter: z.string().default('all'),
  priorityFilter: z.string().default('all'),
  dueDateFilter: z.string().default('all')
});

export type WorkOrderFiltersData = z.infer<typeof workOrderFiltersSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate work order form data
 */
export const validateWorkOrderForm = (data: unknown): { 
  success: boolean; 
  data?: WorkOrderFormData; 
  errors?: z.ZodError 
} => {
  const result = workOrderFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

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
  estimatedHours: undefined,
  hasPM: false,
  pmTemplateId: null,
  assignmentType: 'unassigned',
  assignmentId: null,
  isHistorical: options.isHistorical || false,
  status: options.isHistorical ? 'accepted' : undefined,
  historicalStartDate: undefined,
  historicalNotes: '',
  completedDate: undefined,
});

// ============================================
// Type Guards
// ============================================

/**
 * Type guard to check if a string is a valid WorkOrderStatus
 */
export const isValidStatus = (value: string): value is WorkOrderStatus => {
  return workOrderStatusSchema.safeParse(value).success;
};

/**
 * Type guard to check if a string is a valid WorkOrderPriority
 */
export const isValidPriority = (value: string): value is WorkOrderPriority => {
  return workOrderPrioritySchema.safeParse(value).success;
};

