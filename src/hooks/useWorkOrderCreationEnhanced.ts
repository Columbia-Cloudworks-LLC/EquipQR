
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { createWorkOrder } from '@/services/supabaseDataService';
import { useInitializePMChecklist } from '@/hooks/useInitializePMChecklist';
import { createPM } from '@/services/preventativeMaintenanceService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnhancedCreateWorkOrderData {
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

export const useCreateWorkOrderEnhanced = (options?: { onSuccess?: (workOrder: { id: string; [key: string]: unknown }) => void }) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const initializePMChecklist = useInitializePMChecklist();

  return useMutation({
    mutationFn: async (data: EnhancedCreateWorkOrderData) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      // Auto-assign logic for single-user organizations
      let assigneeId = data.assignmentType === 'user' ? data.assignmentId : undefined;
      const teamId = data.assignmentType === 'team' ? data.assignmentId : undefined;
      let status: 'submitted' | 'assigned' = 'submitted';

      // If no explicit assignment and it's a single-user org, auto-assign to creator
      if (!assigneeId && !teamId && currentOrganization.memberCount === 1) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          assigneeId = user.id;
          status = 'assigned';
        }
      }

      // Create the work order
const workOrderData = {
        title: data.title,
        description: data.description,
        equipment_id: data.equipmentId,
        priority: data.priority,
        due_date: data.dueDate,
        estimated_hours: null, // No longer capturing this in work orders
        has_pm: data.hasPM || false,
        pm_required: data.hasPM || false,
        assignee_id: assigneeId,
        team_id: teamId,
        status,
        acceptance_date: status === 'assigned' ? new Date().toISOString() : null,
        assignee_name: null, // Will be populated by triggers if needed
        created_by_name: null, // Will be populated by triggers if needed
        is_historical: false,
        historical_start_date: null,
        historical_notes: null,
        created_by_admin: null,
        equipment_working_hours_at_creation: data.equipmentWorkingHours || null
      };

      const workOrder = await createWorkOrder(currentOrganization.id, workOrderData);
      
      if (!workOrder) {
        throw new Error('Failed to create work order');
      }

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
            console.error('Failed to update equipment working hours:', error);
            toast.error('Work order created but failed to update equipment hours');
          }
        } catch (error) {
          console.error('Error updating equipment working hours:', error);
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
              .from('pm_templates')
              .select('checklist_data, notes')
              .eq('id', data.pmTemplateId)
              .single();
            
            if (template) {
              checklistData = template.checklist_data;
              notes = template.notes || '';
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
          console.error('Failed to create PM for equipment:', error);
          toast.error('Work order created but PM initialization failed');
        }
      }

      return workOrder;
    },
    onSuccess: (workOrder) => {
      toast.success('Work order created successfully');
      
      // Invalidate relevant queries with standardized keys
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentOrganization.id] });
      
      // Call custom onSuccess if provided, otherwise navigate to work order details
      if (options?.onSuccess) {
        options.onSuccess(workOrder);
      } else {
        navigate(`/work-orders/${workOrder.id}`);
      }
    },
    onError: (error) => {
      console.error('Error creating work order:', error);
      toast.error('Failed to create work order');
    },
  });
};
