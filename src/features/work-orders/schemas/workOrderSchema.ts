/**
 * Work Order Form Schemas
 * 
 * Centralized Zod schemas for work order validation.
 * Extract business validation rules from hooks to enable reuse and testing.
 */

import { z } from 'zod';
import type { WorkOrderStatus, WorkOrderPriority } from '@/features/work-orders/types/workOrder';

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
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .default(''),
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
  // Simplified assignment: just an assignee ID (null = unassigned)
  assigneeId: z.string().optional().nullable().transform(val => val === '' ? null : val),
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

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate work order form data
 */
const validateWorkOrderForm = (data: unknown): { 
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
  // Simplified assignment: null = unassigned
  assigneeId: null,
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
const isValidStatus = (value: string): value is WorkOrderStatus => {
  return workOrderStatusSchema.safeParse(value).success;
};

/**
 * Type guard to check if a string is a valid WorkOrderPriority
 */
const isValidPriority = (value: string): value is WorkOrderPriority => {
  return workOrderPrioritySchema.safeParse(value).success;
};



