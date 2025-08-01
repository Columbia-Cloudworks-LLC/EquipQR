import { useEffect } from 'react';
import { z } from 'zod';
import { useFormValidation } from '@/hooks/useFormValidation';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';

const workOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters"),
  equipmentId: z.string().min(1, "Equipment is required"),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional().nullable(),
  equipmentWorkingHours: z.number().min(0).optional(),
  hasPM: z.boolean().default(false),
  assignmentType: z.enum(['unassigned', 'user', 'team']).optional(),
  assignmentId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  isHistorical: z.boolean().default(false),
  // Historical fields - conditionally required based on isHistorical
  status: z.enum(['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
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

interface UseWorkOrderFormProps {
  workOrder?: EnhancedWorkOrder;
  equipmentId?: string;
  isOpen: boolean;
  initialIsHistorical?: boolean;
}

export const useWorkOrderForm = ({ workOrder, equipmentId, isOpen, initialIsHistorical = false }: UseWorkOrderFormProps) => {
  const isEditMode = !!workOrder;

  const initialValues: Partial<WorkOrderFormData> = {
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    equipmentId: workOrder?.equipment_id || equipmentId || '',
    priority: workOrder?.priority || 'medium',
    dueDate: workOrder?.due_date ? new Date(workOrder.due_date).toISOString().split('T')[0] : undefined,
    equipmentWorkingHours: undefined,
    hasPM: workOrder?.has_pm || false,
    assignmentType: 'unassigned',
    assignmentId: null, // Use null instead of empty string
    isHistorical: initialIsHistorical,
    // Historical fields (only relevant when isHistorical is true)
    status: 'accepted',
    historicalStartDate: undefined,
    historicalNotes: '',
    completedDate: undefined,
  };

  const form = useFormValidation(workOrderFormSchema, initialValues);

  // Reset form when workOrder changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset to initial values
      const resetValues = {
        title: initialValues.title || '',
        description: initialValues.description || '',
        equipmentId: initialValues.equipmentId || '',
        priority: initialValues.priority || 'medium',
        dueDate: initialValues.dueDate || undefined,
        equipmentWorkingHours: initialValues.equipmentWorkingHours,
        hasPM: initialValues.hasPM || false,
        assignmentType: initialValues.assignmentType || 'unassigned',
        assignmentId: null, // Always start with null
        isHistorical: initialValues.isHistorical || false,
        // Historical fields - only set if isHistorical is true
        ...(initialValues.isHistorical ? {
          status: initialValues.status || 'accepted',
          historicalStartDate: initialValues.historicalStartDate,
          historicalNotes: initialValues.historicalNotes || '',
          completedDate: initialValues.completedDate,
        } : {})
      };

      // Set all values at once for better performance
      form.setValues(resetValues);
    }
  }, [isOpen, workOrder, form, initialValues]);

  const checkForUnsavedChanges = (): boolean => {
    return Object.keys(form.values).some(
      key => form.values[key as keyof WorkOrderFormData] !== initialValues[key as keyof WorkOrderFormData]
    );
  };

  return {
    form,
    isEditMode,
    initialValues,
    checkForUnsavedChanges,
  };
};