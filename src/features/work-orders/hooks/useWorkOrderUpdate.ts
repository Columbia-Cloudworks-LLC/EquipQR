
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  estimatedHours?: number;
  hasPM?: boolean;
}

export const useUpdateWorkOrder = () => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, data }: { workOrderId: string; data: UpdateWorkOrderData }) => {
      const updateData: Database["public"]["Tables"]["work_orders"]["Update"] = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
      if (data.estimatedHours !== undefined) updateData.estimated_hours = data.estimatedHours || null;
      if (data.hasPM !== undefined) updateData.has_pm = data.hasPM;

      updateData.updated_at = new Date().toISOString();

      const { data: result, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating work order:', error);
        throw error;
      }

      return result;
    },
    onSuccess: (result, variables) => {
      const { workOrderId } = variables;
      
      // Invalidate and refetch work order queries with standardized keys
      queryClient.invalidateQueries({ 
        queryKey: ['enhanced-work-orders', currentOrganization?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workOrders', currentOrganization?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['work-orders-filtered-optimized', currentOrganization?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboardStats', currentOrganization?.id] 
      });
      // Also invalidate individual work order queries
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder', currentOrganization?.id, workOrderId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workOrder', 'enhanced', currentOrganization?.id, workOrderId] 
      });
      // Invalidate PM queries to refresh PM data
      queryClient.invalidateQueries({ 
        queryKey: ['preventativeMaintenance', workOrderId] 
      });
      
      toast({
        title: 'Work Order Updated',
        description: 'Work order has been successfully updated.',
      });
    },
    onError: (error) => {
      console.error('Update work order error:', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to update this work order. Contact your administrator."
        : errorMessage.includes('not found')
        ? "Work order not found. It may have been deleted."
        : errorMessage.includes('validation') || errorMessage.includes('required')
        ? "Please check all required fields and try again."
        : "Failed to update work order. Please check your connection and try again.";
      
      toast({
        title: 'Update Failed',
        description: specificMessage,
        variant: 'destructive',
      });
      
      showErrorToast(error, 'Work Order Update');
    },
  });
};


