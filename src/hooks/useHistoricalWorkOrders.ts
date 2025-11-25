import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { defaultForkliftChecklist } from '@/services/preventativeMaintenanceService';
import type { Database } from '@/integrations/supabase/types';

export interface HistoricalWorkOrderData {
  equipmentId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  historicalStartDate: string;
  historicalNotes?: string;
  assigneeId?: string;
  teamId?: string;
  dueDate?: string;
  completedDate?: string;
  hasPM?: boolean;
  pmStatus?: string;
  pmCompletionDate?: string;
  pmNotes?: string;
  pmChecklistData?: unknown[];
}

interface HistoricalWorkOrderMutationResult {
  success: boolean;
  error?: string | null;
  has_pm?: boolean;
  pm_id?: string | null;
  work_order_id?: string;
  [key: string]: unknown;
}

export const useCreateHistoricalWorkOrder = (options?: { onSuccess?: (workOrder: HistoricalWorkOrderMutationResult & { id: string }) => void }) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HistoricalWorkOrderData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: result, error } = await supabase.rpc(
        'create_historical_work_order_with_pm',
        {
          p_organization_id: currentOrganization.id,
          p_equipment_id: data.equipmentId,
          p_title: data.title,
          p_description: data.description,
          p_priority: data.priority,
          p_status: data.status,
          p_historical_start_date: data.historicalStartDate,
          p_historical_notes: data.historicalNotes,
          p_assignee_id: data.assigneeId,
          p_team_id: data.teamId,
          p_due_date: data.dueDate,
          p_completed_date: data.completedDate,
          p_has_pm: data.hasPM || false,
          p_pm_status: data.pmStatus || 'pending',
          p_pm_completion_date: data.pmCompletionDate,
          p_pm_notes: data.pmNotes,
          p_pm_checklist_data: data.hasPM && (!data.pmChecklistData || data.pmChecklistData.length === 0) 
            ? defaultForkliftChecklist 
            : data.pmChecklistData || []
        }
      );

      if (error) {
        console.error('Error creating historical work order:', error);
        throw error;
      }

      const resultData = result as HistoricalWorkOrderMutationResult | null;
      if (!resultData?.success) {
        throw new Error(resultData?.error || 'Failed to create historical work order');
      }

      return resultData;
    },
    onSuccess: (result: HistoricalWorkOrderMutationResult) => {
      // Invalidate work orders queries
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['teamBasedWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrder'] });
      
      // Invalidate PM queries if PM was created
      if (result.has_pm && result.pm_id) {
        queryClient.invalidateQueries({ queryKey: ['preventativeMaintenance'] });
      }

      toast.success('Historical work order created successfully');
      
      // Call custom onSuccess callback if provided
      if (options?.onSuccess && result.work_order_id) {
        options.onSuccess({ id: result.work_order_id, ...result });
      }
    },
    onError: (error: unknown) => {
      console.error('Error creating historical work order:', error);
      const message = error instanceof Error ? error.message : 'Failed to create historical work order';
      toast.error(message);
    }
  });
};

export const useUpdateHistoricalWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      data 
    }: { 
      workOrderId: string; 
      data: Partial<HistoricalWorkOrderData> 
    }) => {
      const updateData: Database['public']['Tables']['work_orders']['Update'] = {};
      
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.priority) updateData.priority = data.priority;
      if (data.status) updateData.status = data.status;
      if (data.historicalStartDate) updateData.historical_start_date = data.historicalStartDate;
      if (data.historicalNotes !== undefined) updateData.historical_notes = data.historicalNotes;
      if (data.assigneeId !== undefined) updateData.assignee_id = data.assigneeId;
      if (data.teamId !== undefined) updateData.team_id = data.teamId;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.completedDate !== undefined) updateData.completed_date = data.completedDate;

      const { error } = await supabase
        .from('work_orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId)
        .eq('is_historical', true);

      if (error) {
        console.error('Error updating historical work order:', error);
        throw error;
      }

      return { workOrderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['teamBasedWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrder'] });
      toast.success('Historical work order updated successfully');
    },
    onError: (error: unknown) => {
      console.error('Error updating historical work order:', error);
      toast.error('Failed to update historical work order');
    }
  });
};