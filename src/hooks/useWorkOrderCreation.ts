import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { WorkOrderService } from '@/services/WorkOrderService';
import { createPM, PMChecklistItem } from '@/services/preventativeMaintenanceService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface CreateWorkOrderData {
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  equipmentWorkingHours?: number;
  hasPM?: boolean;
  pmTemplateId?: string;
  assignmentType?: 'user' | 'team';
  assignmentId?: string;
}

export const useCreateWorkOrder = (options?: { onSuccess?: (workOrder: { id: string; [key: string]: unknown }) => void }) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateWorkOrderData) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      // Auto-assign logic for single-user organizations
      let assigneeId = data.assignmentType === 'user' ? data.assignmentId : undefined;
      let status: 'submitted' | 'assigned' = 'submitted';

      // If assignee is explicitly chosen, mark as assigned
      if (assigneeId) {
        status = 'assigned';
      } else if (currentOrganization.memberCount === 1) {
        // If no explicit assignment and it's a single-user org, auto-assign to creator
        assigneeId = userData.user.id;
        status = 'assigned';
      }

      // Create the work order using WorkOrderService
      const service = new WorkOrderService(currentOrganization.id);
      const response = await service.create({
        title: data.title,
        description: data.description,
        equipment_id: data.equipmentId,
        priority: data.priority,
        due_date: data.dueDate,
        estimated_hours: undefined,
        assignee_id: assigneeId,
        team_id: undefined, // Work orders are not assigned to teams
        status,
        created_by: userData.user.id,
        has_pm: data.hasPM || false
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create work order');
      }

      const workOrder = response.data;

      // Multi-equipment linking removed: work orders now support a single equipment only

      // If equipment working hours are provided, update equipment
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

      // If PM is required, create PM for the single equipment
      if (data.hasPM && data.equipmentId) {
        try {
          // Get checklist data from template (existing logic)
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

          // Create PM for the single equipment
          await createPM({
            workOrderId: workOrder.id,
            equipmentId: data.equipmentId,
            organizationId: currentOrganization.id,
            checklistData,
            notes,
            templateId: data.pmTemplateId
          });
        } catch (error) {
          logger.error('Failed to create PM for equipment', error);
          toast.error('Work order created but PM initialization failed');
        }
      }

      return workOrder;
    },
    onSuccess: (workOrder) => {
      toast.success('Work order created successfully');
      
      // Invalidate relevant queries with standardized keys
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentOrganization?.id] });
      
      // Call custom onSuccess if provided, otherwise navigate to work order details
      if (options?.onSuccess) {
        options.onSuccess(workOrder);
      } else {
        navigate(`/dashboard/work-orders/${workOrder.id}`);
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
