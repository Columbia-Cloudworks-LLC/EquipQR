
import { useEffect, useRef, useMemo } from 'react';
import { useFormValidation } from '@/hooks/useFormValidation';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import { 
  workOrderFormSchema, 
  getDefaultWorkOrderFormValues,
  type WorkOrderFormData 
} from '@/features/work-orders/schemas/workOrderSchema';

// Re-export for backward compatibility
export type { WorkOrderFormData };

interface UseWorkOrderFormProps {
  workOrder?: EnhancedWorkOrder;
  equipmentId?: string;
  isOpen: boolean;
  initialIsHistorical?: boolean;
  pmData?: { template_id?: string | null } | null;
}

export const useWorkOrderForm = ({ workOrder, equipmentId, isOpen, initialIsHistorical = false, pmData }: UseWorkOrderFormProps) => {
  const isEditMode = !!workOrder;
  const initializationRef = useRef<{ 
    lastWorkOrderId?: string; 
    lastEquipmentId?: string; 
    hasInitialized: boolean;
  }>({ hasInitialized: false });

  const initialValues: Partial<WorkOrderFormData> = useMemo(() => {
    // Get defaults from schema helper
    const defaults = getDefaultWorkOrderFormValues({ 
      equipmentId, 
      isHistorical: initialIsHistorical 
    });
    
    // Override with work order values if editing
    return {
      ...defaults,
      title: workOrder?.title || defaults.title,
      description: workOrder?.description || defaults.description,
      equipmentId: workOrder?.equipment_id || equipmentId || defaults.equipmentId,
      priority: workOrder?.priority || defaults.priority,
      dueDate: workOrder?.due_date ? new Date(workOrder.due_date).toISOString().split('T')[0] : defaults.dueDate,
      estimatedHours: workOrder?.estimated_hours ?? defaults.estimatedHours,
      hasPM: workOrder?.has_pm ?? defaults.hasPM,
      // Set PM template ID from PM data if editing
      pmTemplateId: pmData?.template_id || defaults.pmTemplateId,
    };
  }, [workOrder, equipmentId, initialIsHistorical, pmData]);

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
          priority: initialValues.priority || 'medium',
          dueDate: initialValues.dueDate || undefined,
          estimatedHours: initialValues.estimatedHours || undefined,
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


