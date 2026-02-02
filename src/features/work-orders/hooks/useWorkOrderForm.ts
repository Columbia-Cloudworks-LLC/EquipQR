
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import { 
  workOrderFormSchema, 
  getDefaultWorkOrderFormValues,
  type WorkOrderFormData 
} from '@/features/work-orders/schemas/workOrderSchema';
import { showErrorToast } from '@/utils/errorHandling';

// Re-export for backward compatibility
export type { WorkOrderFormData };

/** Adapter interface matching the old useFormValidation API for backward compatibility */
interface FormAdapter<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  validate: () => Promise<{ isValid: boolean; errors: Record<string, string> }>;
  validateField: (field: keyof T) => Promise<boolean>;
  reset: () => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>;
}

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
      // Preserve assignee when editing (snake_case from DB -> camelCase for form)
      assigneeId: workOrder?.assignee_id ?? defaults.assigneeId,
    };
  }, [workOrder, equipmentId, initialIsHistorical, pmData]);

  // Use react-hook-form with zodResolver
  const rhf = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: initialValues as WorkOrderFormData,
    mode: 'onChange',
  });

  const { formState, watch, setValue: rhfSetValue, reset: rhfReset, trigger, getValues } = rhf;

  // Watch all form values for reactivity
  const watchedValues = watch();

  // Convert react-hook-form errors to the flat Record<string, string> format
  const flatErrors = useMemo((): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, error] of Object.entries(formState.errors)) {
      if (error?.message) {
        result[key] = error.message as string;
      }
    }
    return result;
  }, [formState.errors]);

  // Create setValue adapter
  const setValueAdapter = useCallback(<K extends keyof WorkOrderFormData>(
    field: K, 
    value: WorkOrderFormData[K]
  ) => {
    rhfSetValue(field, value, { shouldValidate: true, shouldDirty: true });
  }, [rhfSetValue]);

  // Create setValues adapter
  const setValuesAdapter = useCallback((values: Partial<WorkOrderFormData>) => {
    for (const [key, value] of Object.entries(values)) {
      rhfSetValue(key as keyof WorkOrderFormData, value as WorkOrderFormData[keyof WorkOrderFormData], { shouldValidate: false });
    }
    // Trigger validation once after setting all values
    trigger();
  }, [rhfSetValue, trigger]);

  // Create validate adapter (async to properly await validation)
  const validateAdapter = useCallback(async (): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
    const isValid = await trigger();
    // Re-read errors from getValues context after trigger completes
    const currentErrors: Record<string, string> = {};
    for (const [key, error] of Object.entries(rhf.formState.errors)) {
      if (error?.message) {
        currentErrors[key] = error.message as string;
      }
    }
    return { isValid, errors: currentErrors };
  }, [trigger, rhf.formState.errors]);

  // Create validateField adapter (async to properly await validation)
  const validateFieldAdapter = useCallback(async (field: keyof WorkOrderFormData): Promise<boolean> => {
    const isValid = await trigger(field);
    return isValid;
  }, [trigger]);

  // Create reset adapter
  const resetAdapter = useCallback(() => {
    rhfReset(initialValues as WorkOrderFormData);
  }, [rhfReset, initialValues]);

  // Create handleSubmit adapter matching the old signature
  const handleSubmitAdapter = useCallback(async (
    onSubmit: (values: WorkOrderFormData) => Promise<void> | void
  ) => {
    const isValid = await trigger();
    if (!isValid) return;

    try {
      await onSubmit(getValues() as WorkOrderFormData);
    } catch (error) {
      console.error('Form submission error:', error);
      showErrorToast(error, 'Form Submission');
    }
  }, [trigger, getValues]);

  // Build the form adapter object that matches the old API
  const form: FormAdapter<WorkOrderFormData> = useMemo(() => ({
    values: watchedValues as Partial<WorkOrderFormData>,
    errors: flatErrors,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    setValue: setValueAdapter,
    setValues: setValuesAdapter,
    validate: validateAdapter,
    validateField: validateFieldAdapter,
    reset: resetAdapter,
    handleSubmit: handleSubmitAdapter,
  }), [
    watchedValues, 
    flatErrors, 
    formState.isValid, 
    formState.isSubmitting, 
    setValueAdapter, 
    setValuesAdapter, 
    validateAdapter, 
    validateFieldAdapter, 
    resetAdapter, 
    handleSubmitAdapter
  ]);

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
        const resetValues: Partial<WorkOrderFormData> = {
          title: initialValues.title || '',
          description: initialValues.description || '',
          equipmentId: initialValues.equipmentId || '',
          priority: initialValues.priority || 'medium',
          dueDate: initialValues.dueDate || undefined,
          estimatedHours: initialValues.estimatedHours || undefined,
          hasPM: initialValues.hasPM || false,
          pmTemplateId: initialValues.pmTemplateId || null,
          // Simplified assignment: null = unassigned
          assigneeId: initialValues.assigneeId || null,
          isHistorical: initialValues.isHistorical || false,
          // Historical fields - only set if isHistorical is true
          ...(initialValues.isHistorical ? {
            status: initialValues.status || 'accepted',
            historicalStartDate: initialValues.historicalStartDate,
            historicalNotes: initialValues.historicalNotes || '',
            completedDate: initialValues.completedDate,
          } : {})
        };

        rhfReset(resetValues as WorkOrderFormData);
        
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
  }, [isOpen, workOrder?.id, equipmentId, rhfReset, initialValues]);

  /**
   * Checks if the form has unsaved changes compared to initial values.
   * 
   * Empty value normalization: We intentionally treat undefined, null, and empty string 
   * as equivalent for form state comparison. This is appropriate because:
   * 1. Database optional fields may be null/undefined, but form clears to empty string
   * 2. For "unsaved changes" detection, all empty states mean "no value" semantically
   * 3. Users clearing a field (→ '') should match an initially null/undefined field
   * 
   * @returns true if any field has changed from its initial value
   */
  const checkForUnsavedChanges = useCallback((): boolean => {
    const isEmpty = (value: unknown): boolean => {
      return value === undefined || value === null || value === '';
    };

    // Helper to compare values, treating all "empty" values as equivalent
    const hasChanged = (current: unknown, initial: unknown): boolean => {
      // If both are "empty", no change
      if (isEmpty(current) && isEmpty(initial)) return false;
      // If only one is empty, there's a change
      if (isEmpty(current) !== isEmpty(initial)) return true;
      // Otherwise compare directly
      return current !== initial;
    };

    const currentValues = getValues();
    return Object.keys(currentValues).some(key => {
      const currentValue = currentValues[key as keyof WorkOrderFormData];
      const initialValue = initialValues[key as keyof WorkOrderFormData];
      return hasChanged(currentValue, initialValue);
    });
  }, [getValues, initialValues]);

  return {
    form,
    isEditMode,
    initialValues,
    checkForUnsavedChanges,
  };
};


