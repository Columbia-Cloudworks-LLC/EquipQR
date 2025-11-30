import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';
import { WorkOrderService } from '@/services/WorkOrderService';

export interface CreateWorkOrderData {
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  estimatedHours?: number;
  assigneeId?: string;
  teamId?: string;
}

export const useCreateWorkOrder = () => {
  const { getCurrentOrganization } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentOrg = getCurrentOrganization();

  return useMutation({
    mutationFn: async (workOrderData: CreateWorkOrderData) => {
      if (!currentOrg) throw new Error('No current organization');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const service = new WorkOrderService(currentOrg.id);
      const response = await service.create({
        title: workOrderData.title,
        description: workOrderData.description,
        equipment_id: workOrderData.equipmentId,
        priority: workOrderData.priority,
        due_date: workOrderData.dueDate ? new Date(workOrderData.dueDate).toISOString() : undefined,
        estimated_hours: workOrderData.estimatedHours,
        assignee_id: workOrderData.assigneeId,
        team_id: workOrderData.teamId,
        created_by: userData.user.id
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create work order');
      }

      return response.data;
    },
    onSuccess: (workOrder) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrg?.id] });
      
      toast.success('Work order created successfully');
      
      // Navigate to the new work order's details page
      if (workOrder) {
        navigate(`/dashboard/work-orders/${workOrder.id}`);
      }
    },
    onError: (error) => {
      console.error('Error creating work order:', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to create work orders. Contact your administrator."
        : errorMessage.includes('equipment')
        ? "The selected equipment is not available. Please choose different equipment."
        : errorMessage.includes('validation') || errorMessage.includes('required')
        ? "Please check all required fields and try again."
        : "Failed to create work order. Please check your connection and try again.";
      
      toast.error('Work Order Creation Failed', { description: specificMessage });
      showErrorToast(error, 'Work Order Creation');
    }
  });
};
