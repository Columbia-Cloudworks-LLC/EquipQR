
import { useEffect, useRef, useMemo } from 'react';
import { z } from 'zod';
import { useFormValidation } from '@/hooks/useFormValidation';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';

const workOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(1000, "Description must be less than 1000 characters"),
  equipmentId: z.string().min(1, "Equipment is required"),
  equipmentIds: z.array(z.string()).min(1, "At least one equipment is required"),
  primaryEquipmentId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional().nullable(),
  hasPM: z.boolean().default(false),
  pmTemplateId: z.string().optional().nullable(),
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
  const initializationRef = useRef<{ 
    lastWorkOrderId?: string; 
    lastEquipmentId?: string; 
    hasInitialized: boolean;
  }>({ hasInitialized: false });

  const initialValues: Partial<WorkOrderFormData> = useMemo(() => ({
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    equipmentId: workOrder?.equipment_id || equipmentId || '',
    equipmentIds: workOrder?.equipment_id ? [workOrder.equipment_id] : equipmentId ? [equipmentId] : [],
    primaryEquipmentId: workOrder?.equipment_id || equipmentId,
    priority: workOrder?.priority || 'medium',
    dueDate: workOrder?.due_date ? new Date(workOrder.due_date).toISOString().split('T')[0] : undefined,
    hasPM: workOrder?.has_pm || false,
    pmTemplateId: null,
    assignmentType: 'unassigned',
    assignmentId: null,
    isHistorical: initialIsHistorical,
    // Historical fields (only relevant when isHistorical is true)
    status: 'accepted',
    historicalStartDate: undefined,
    historicalNotes: '',
    completedDate: undefined,
  }), [workOrder, equipmentId, initialIsHistorical]);

  const form = useFormValidation(workOrderFormSchema, initialValues);

  // Reset form only when dialog opens for first time or when workOrder/equipment changes
  useEffect(() => {
    if (isOpen) {
      const currentWorkOrderId = workOrder?.id || '';
      const currentEquipmentId = equipmentId || '';
      
      // Only reset if this is a new dialog session or if workOrder/equipment changed
      const shouldReset = !initializationRef.current.hasInitialized ||
                         initializationRef.current.lastWorkOrderId !== currentWorkOrderId ||
                         initializationRef.current.lastEquipmentId !== currentEquipmentId;

      if (shouldReset) {
        const resetValues = {
          title: initialValues.title || '',
          description: initialValues.description || '',
          equipmentId: initialValues.equipmentId || '',
          equipmentIds: initialValues.equipmentIds || [],
          primaryEquipmentId: initialValues.primaryEquipmentId,
          priority: initialValues.priority || 'medium',
          dueDate: initialValues.dueDate || undefined,
          hasPM: initialValues.hasPM || false,
          pmTemplateId: initialValues.pmTemplateId || null,
          assignmentType: initialValues.assignmentType || 'unassigned',
          assignmentId: null,
          isHistorical: initialValues.isHistorical || false,
          // Historical fields - only set if isHistorical is true
          ...(initialValues.isHistorical ? {
            status: initialValues.status || 'accepted',
            historicalStartDate: initialValues.historicalStartDate,
            historicalNotes: initialValues.historicalNotes || '',
            completedDate: initialValues.completedDate,
          } : {})
        };

        form.setValues(resetValues);
        
        // Update initialization tracking
        initializationRef.current = {
          lastWorkOrderId: currentWorkOrderId,
          lastEquipmentId: currentEquipmentId,
          hasInitialized: true
        };
      }
    } else {
      // Reset initialization when dialog closes
      initializationRef.current.hasInitialized = false;
    }
  }, [isOpen, workOrder?.id, equipmentId, form, initialValues]);

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
