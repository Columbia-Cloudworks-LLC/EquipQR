import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUpdateWorkOrder, UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import type { WorkOrderFormData } from '@/features/work-orders/hooks/useWorkOrderForm';
import {
  createPM,
  updatePM,
  deletePM,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';

interface PMData {
  id: string;
  status?: string;
  notes?: string;
  checklist_data?: unknown[];
  equipment_id?: string;
  template_id?: string | null;
  /** Server `updated_at` — used for offline PM conflict detection when swapping templates. */
  updated_at?: string | null;
}

export const useWorkOrderDetailsActions = (workOrderId: string, organizationId: string, pmData?: PMData | null) => {
  const { user } = useAuth();
  const refreshOfflineQueue = useOfflineQueueOptional()?.refresh;
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
    const checklistData = pmData.checklist_data as PMChecklistItem[] | undefined;
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

    const runPMChanges = async (allowOfflineQueue: boolean) => {
      // 1. If PM is being disabled (hasPM: false) and PM exists, delete it
      if (pmBeingDisabled && pmData?.id) {
        if (allowOfflineQueue && user?.id) {
          const svc = new OfflineAwareWorkOrderService(organizationId, user.id);
          const result = await svc.deletePM(pmData.id);
          if (result.queuedOffline) {
            refreshOfflineQueue?.();
          }
          return;
        }

        const deleted = await deletePM(pmData.id);
        if (!deleted) {
          throw new Error('Failed to remove PM checklist');
        }
        return;
      }

      // 2. If PM is being enabled (hasPM: true) and PM doesn't exist, create it
      // Prioritize form's equipmentId over parameter to handle equipment changes during update
      if (pmBeingEnabled && data.pmTemplateId) {
        const effectiveEquipmentId = data.equipmentId || equipmentId;
        if (!effectiveEquipmentId) return;

        const checklistData = await getTemplateChecklistData(data.pmTemplateId);
        if (allowOfflineQueue && user?.id) {
          const svc = new OfflineAwareWorkOrderService(organizationId, user.id);
          const result = await svc.initPM({
            workOrderId,
            equipmentId: effectiveEquipmentId,
            templateId: data.pmTemplateId,
            checklistData,
          });
          if (result.queuedOffline) {
            refreshOfflineQueue?.();
          } else if (!result.data) {
            throw new Error('Failed to create PM checklist');
          }
          return;
        }

        const created = await createPM({
          workOrderId,
          equipmentId: effectiveEquipmentId,
          organizationId,
          checklistData,
          templateId: data.pmTemplateId,
        });
        if (!created) {
          throw new Error('Failed to create PM checklist');
        }
        return;
      }

      // 3. If PM template is being changed and PM exists, update the template
      if (pmExists && pmTemplateChanged && data.hasPM && data.pmTemplateId) {
        const checklistData = await getTemplateChecklistData(data.pmTemplateId);
        const payload = {
          templateId: data.pmTemplateId,
          checklistData, // Reset checklist to new template
          status: 'pending' as const, // Reset status since checklist is new
          completedAt: null,
          completedBy: null,
        };

        if (allowOfflineQueue && user?.id) {
          const svc = new OfflineAwareWorkOrderService(organizationId, user.id);
          const result = await svc.updatePM(pmData!.id, payload, pmData!.updated_at ?? undefined);
          if (result.queuedOffline) {
            refreshOfflineQueue?.();
          } else if (!result.data) {
            throw new Error('Failed to update PM checklist');
          }
          return;
        }

        const updated = await updatePM(pmData!.id, payload, organizationId);
        if (!updated) {
          throw new Error('Failed to update PM checklist');
        }
      }
    };

    try {
      if (navigator.onLine) {
        // Online path: apply PM changes first so PM failures never commit a
        // mismatched hasPM state on the work order.
        await runPMChanges(false);
        await updateWorkOrderMutation.mutateAsync({
          workOrderId,
          data: updateData,
        });
      } else {
        // Offline path: queue work-order update first to preserve FIFO replay
        // order (work_order_update before pm_init/pm_update follow-ups).
        await updateWorkOrderMutation.mutateAsync({
          workOrderId,
          data: updateData,
        });
        await runPMChanges(true);
      }
    } catch (pmError) {
      const message = pmBeingDisabled
        ? 'Failed to remove PM checklist. Check your connection and try again.'
        : pmBeingEnabled
          ? 'Failed to create PM checklist. Check your connection and try again.'
          : 'Failed to update PM checklist. Check your connection and try again.';
      toast.error(message);
      throw pmError;
    }
    
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
  }, [
    workOrderId,
    organizationId,
    queryClient,
    updateWorkOrderMutation,
    pmData,
    getTemplateChecklistData,
    user?.id,
    refreshOfflineQueue,
  ]);

  // Handle form submission with PM change detection
  const handleUpdateWorkOrder = useCallback(async (data: WorkOrderFormData, originalHasPM?: boolean, equipmentId?: string) => {
    // Check if PM is being disabled when PM data exists
    const pmBeingDisabled = originalHasPM === true && data.hasPM === false;
    
    // Check if PM template is being changed when PM has meaningful data
    // This includes: changing from one template to another, OR setting a template on a PM that didn't have one
    const pmTemplateChanged = pmData?.id && (pmData.template_id ?? null) !== (data.pmTemplateId ?? null);
    
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
    // Read the ref value BEFORE clearing it, as the ref is explicitly reset in this handler and in handleCancelPMChange
    const pending = pendingFormDataRef.current;
    
    if (pending) {
      // Clear the ref first to prevent stale data
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
