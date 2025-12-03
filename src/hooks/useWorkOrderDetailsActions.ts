import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateWorkOrder, UpdateWorkOrderData } from '@/hooks/useWorkOrderUpdate';
import type { WorkOrderFormData } from '@/hooks/useWorkOrderForm';
import { 
  createPM, 
  updatePM, 
  deletePM, 
  type PMChecklistItem 
} from '@/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/services/pmChecklistTemplatesService';

interface PMData {
  id: string;
  status?: string;
  notes?: string;
  checklist_data?: unknown[];
  equipment_id?: string;
  template_id?: string | null;
}

export const useWorkOrderDetailsActions = (workOrderId: string, organizationId: string, pmData?: PMData | null) => {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showPMWarning, setShowPMWarning] = useState(false);
  const [pmChangeType, setPmChangeType] = useState<'disable' | 'change_template'>('disable');
  // Use a ref for pending form data to avoid stale closure issues
  // Store both form data and equipmentId to ensure the equipmentId passed to handleUpdateWorkOrder is preserved
  const pendingFormDataRef = useRef<{ data: WorkOrderFormData; equipmentId?: string } | null>(null);
  const queryClient = useQueryClient();
  const updateWorkOrderMutation = useUpdateWorkOrder();

  const handleEditWorkOrder = () => {
    setIsEditFormOpen(true);
  };

  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
    // Don't clear pendingFormDataRef here - it might be needed for PM warning dialog
    // The ref will be cleared after successful update or when canceling PM change
  };

  // Helper to get PM data content details (notes and completed items)
  const getPMDataContentDetails = (pmData?: PMData | null) => {
    if (!pmData) return { hasNotes: false, hasCompletedItems: false };
    const hasNotes = !!(pmData.notes && pmData.notes.trim().length > 0);
    const checklistData = pmData.checklist_data as Array<{ condition?: number | null; notes?: string }> | undefined;
    const hasCompletedItems = Array.isArray(checklistData) && checklistData.some(
      item => item.condition != null || (item.notes && item.notes.trim().length > 0)
    );
    return { hasNotes, hasCompletedItems };
  };

  // Check if PM data has meaningful content that would be lost
  const hasMeaningfulPMData = useCallback(() => {
    const { hasNotes, hasCompletedItems } = getPMDataContentDetails(pmData);
    return hasNotes || hasCompletedItems;
  }, [pmData]);

  // Get PM data details for warning dialog
  const getPMDataDetails = useCallback(() => {
    return getPMDataContentDetails(pmData);
  }, [pmData]);

  // Helper to get template checklist data
  const getTemplateChecklistData = useCallback(async (templateId: string): Promise<PMChecklistItem[]> => {
    try {
      const template = await pmChecklistTemplatesService.getTemplate(templateId);
      if (template?.template_data) {
        return (template.template_data as PMChecklistItem[]).map(item => ({
          ...item,
          condition: undefined, // Reset condition for fresh checklist
          notes: '' // Reset notes for fresh checklist
        }));
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    }
    return [];
  }, []);

  // Perform the actual update
  const performUpdate = useCallback(async (data: WorkOrderFormData, equipmentId?: string) => {
    const updateData: UpdateWorkOrderData = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate || undefined,
      hasPM: data.hasPM,
    };
    
    // Handle PM operations based on changes
    const pmExists = !!pmData?.id;
    const pmTemplateChanged = pmData?.template_id !== data.pmTemplateId;
    const pmBeingEnabled = data.hasPM === true && !pmExists;
    const pmBeingDisabled = data.hasPM === false && pmExists;
    
    // 1. If PM is being disabled (hasPM: false) and PM exists, delete it
    if (pmBeingDisabled && pmData?.id) {
      await deletePM(pmData.id);
    }
    // 2. If PM is being enabled (hasPM: true) and PM doesn't exist, create it
    // Prioritize form's equipmentId over parameter to handle equipment changes during update
    else if (pmBeingEnabled && data.pmTemplateId) {
      const effectiveEquipmentId = data.equipmentId || equipmentId;
      if (effectiveEquipmentId) {
        const checklistData = await getTemplateChecklistData(data.pmTemplateId);
        await createPM({
          workOrderId,
          equipmentId: effectiveEquipmentId,
          organizationId,
          checklistData,
          templateId: data.pmTemplateId
        });
      }
    }
    // 3. If PM template is being changed and PM exists, update the template
    else if (pmExists && pmTemplateChanged && data.hasPM && data.pmTemplateId) {
      // Get the new template's checklist data
      const checklistData = await getTemplateChecklistData(data.pmTemplateId);
      await updatePM(pmData!.id, {
        templateId: data.pmTemplateId,
        checklistData, // Reset checklist to new template
        status: 'pending', // Reset status since checklist is new
        completedAt: null,
        completedBy: null
      });
    }
    
    // Update the work order
    await updateWorkOrderMutation.mutateAsync({
      workOrderId,
      data: updateData
    });
    
    // Refresh the work order data after update - invalidate all relevant query keys
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', 'enhanced', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrders', organizationId] 
    });
    // Also invalidate PM queries to refresh PM data
    queryClient.invalidateQueries({ 
      queryKey: ['preventativeMaintenance', workOrderId] 
    });
    // Invalidate equipment-specific PM queries if we have equipment info
    if (pmData?.equipment_id || equipmentId) {
      queryClient.invalidateQueries({ 
        queryKey: ['preventativeMaintenance', workOrderId, pmData?.equipment_id || equipmentId, organizationId] 
      });
    }
    
    setIsEditFormOpen(false);
  }, [workOrderId, organizationId, queryClient, updateWorkOrderMutation, pmData, getTemplateChecklistData]);

  // Handle form submission with PM change detection
  const handleUpdateWorkOrder = useCallback(async (data: WorkOrderFormData, originalHasPM?: boolean, equipmentId?: string) => {
    // Check if PM is being disabled when PM data exists
    const pmBeingDisabled = originalHasPM === true && data.hasPM === false;
    
    // Check if PM template is being changed when PM has meaningful data
    // This includes: changing from one template to another, OR setting a template on a PM that didn't have one
    const pmTemplateChanged = pmData?.id && data.pmTemplateId && pmData.template_id !== data.pmTemplateId;
    
    if (pmBeingDisabled && pmData && hasMeaningfulPMData()) {
      // Show warning dialog for disabling PM
      pendingFormDataRef.current = { data, equipmentId };
      setPmChangeType('disable');
      setShowPMWarning(true);
      return;
    }
    
    if (pmTemplateChanged && hasMeaningfulPMData()) {
      // Show warning dialog for changing PM template
      pendingFormDataRef.current = { data, equipmentId };
      setPmChangeType('change_template');
      setShowPMWarning(true);
      return;
    }
    
    // No warning needed, perform update directly
    await performUpdate(data, equipmentId || pmData?.equipment_id);
  }, [pmData, hasMeaningfulPMData, performUpdate]);

  // Confirm PM change and proceed with update
  const handleConfirmPMChange = useCallback(async () => {
    // Read the ref value BEFORE closing the dialog, as the onOpenChange handler resets it
    const pending = pendingFormDataRef.current;
    
    if (pending) {
      // Clear the ref first to prevent it from being reset by onOpenChange
      pendingFormDataRef.current = null;
      setShowPMWarning(false);
      // Use stored equipmentId if available, fallback to pmData?.equipment_id for backward compatibility
      await performUpdate(pending.data, pending.equipmentId ?? pmData?.equipment_id);
    } else {
      setShowPMWarning(false);
    }
  }, [performUpdate, pmData?.equipment_id]);

  // Cancel PM change
  const handleCancelPMChange = useCallback(() => {
    setShowPMWarning(false);
    pendingFormDataRef.current = null; // Clear the ref when canceling
  }, []);

  const handleStatusUpdate = () => {
    // Invalidate all relevant queries to refresh the data
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', 'enhanced', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['workOrders', organizationId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['dashboardStats', organizationId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['preventativeMaintenance', workOrderId] 
    });
  };

  const handlePMUpdate = () => {
    // Don't invalidate PM queries - the mutation hook already handles cache updates
    // Invalidating here causes refetches that can fail (406 errors) and trigger re-initialization
    // Only invalidate work order queries to refresh status/completion state
    queryClient.invalidateQueries({ 
      queryKey: ['workOrder', organizationId, workOrderId],
      refetchType: 'active' // Only refetch active queries
    });
  };

  return {
    isEditFormOpen,
    showMobileSidebar,
    setShowMobileSidebar,
    handleEditWorkOrder,
    handleCloseEditForm,
    handleUpdateWorkOrder,
    handleStatusUpdate,
    handlePMUpdate,
    // PM warning dialog state
    showPMWarning,
    setShowPMWarning,
    pmChangeType,
    handleConfirmPMChange,
    handleCancelPMChange,
    getPMDataDetails,
    isUpdating: updateWorkOrderMutation.isPending,
  };
};