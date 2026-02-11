import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { createPM, PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';

export interface CreateWorkOrderData {
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  equipmentWorkingHours?: number;
  hasPM?: boolean;
  pmTemplateId?: string;
  // Simplified assignment: just pass the assigneeId (null/undefined = unassigned)
  assigneeId?: string;
}

/** Result shape from mutationFn. */
interface CreateWorkOrderResult {
  workOrder: { id: string; [key: string]: unknown } | null;
  queuedOffline: boolean;
}

export const useCreateWorkOrder = (options?: { onSuccess?: (workOrder: { id: string; [key: string]: unknown }) => void }) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async (data: CreateWorkOrderData): Promise<CreateWorkOrderResult> => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Auto-assign logic for single-user organizations
      let assigneeId = data.assigneeId;
      if (!assigneeId && currentOrganization.memberCount === 1) {
        assigneeId = user.id;
      }

      // ── Offline-aware create (pre-check + fallback) ──
      const svc = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const result = await svc.createWorkOrder(data, assigneeId);

      if (result.queuedOffline) {
        // Signal the context to re-read localStorage so banner updates
        offlineCtx?.refresh();
        return { workOrder: null, queuedOffline: true };
      }

      const workOrder = result.data!;

      // ── Side-effects (only when online create succeeds) ──

      // Update equipment working hours
      if (data.equipmentWorkingHours && data.equipmentWorkingHours > 0) {
        try {
          const { error } = await supabase.rpc('update_equipment_working_hours', {
            p_equipment_id: data.equipmentId,
            p_new_hours: data.equipmentWorkingHours,
            p_update_source: 'work_order',
            p_work_order_id: workOrder.id,
            p_notes: `Updated from work order: ${data.title}`
          });
          if (error) {
            logger.error('Failed to update equipment working hours', error);
            toast.error('Work order created but failed to update equipment hours');
          }
        } catch (error) {
          logger.error('Error updating equipment working hours', error);
          toast.error('Work order created but failed to update equipment hours');
        }
      }

      // Create PM if required
      if (data.hasPM && data.equipmentId) {
        try {
          let checklistData = null;
          let notes = '';
          if (data.pmTemplateId) {
            const { data: template } = await supabase
              .from('pm_checklist_templates')
              .select('template_data, description')
              .eq('id', data.pmTemplateId)
              .single();
            if (template) {
              checklistData = template.template_data as PMChecklistItem[];
              notes = template.description || '';
            }
          }
          await createPM({
            workOrderId: workOrder.id,
            equipmentId: data.equipmentId,
            organizationId: currentOrganization.id,
            checklistData,
            notes,
            templateId: data.pmTemplateId,
          });
        } catch (error) {
          logger.error('Failed to create PM for equipment', error);
          toast.error('Work order created but PM initialization failed');
        }
      }

      return { workOrder, queuedOffline: false };
    },
    onSuccess: (result) => {
      if (result.queuedOffline) {
        toast.info('Saved offline', {
          description: 'This work order will sync when your connection returns.',
        });
        navigate('/dashboard/work-orders');
        return;
      }

      // Normal success
      toast.success('Work order created successfully');
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentOrganization?.id] });

      if (result.workOrder) {
        if (options?.onSuccess) {
          options.onSuccess(result.workOrder);
        } else {
          navigate(`/dashboard/work-orders/${result.workOrder.id}`);
        }
      }
    },
    onError: (error) => {
      logger.error('Error creating work order', error);
      toast.error('Failed to create work order');
    },
  });
};

// Backward compatibility exports
export type EnhancedCreateWorkOrderData = CreateWorkOrderData;
export const useCreateWorkOrderEnhanced = useCreateWorkOrder;
