/**
 * Work Order Assignment Management Hook
 * 
 * This hook provides mutation capabilities for work order assignments.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useWorkOrderAssignmentOptions } from './useWorkOrderAssignment';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';

export interface AssignmentUpdateData {
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export const useWorkOrderAssignmentManagement = (organizationId: string, workOrderId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { assignmentOptions, isLoading: optionsLoading } = useWorkOrderAssignmentOptions(organizationId);

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentUpdateData) => {
      const updateData: Database["public"]["Tables"]["work_orders"]["Update"] = {
        assignee_id: data.assigneeId,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId);

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Assignment Updated",
        description: `Work order ${data.assigneeId ? 'assigned to ' + data.assigneeName : 'unassigned'} successfully`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['workOrder', organizationId, workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', organizationId] });
    },
    onError: (error) => {
      console.error('Assignment update error:', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to assign work orders. Contact your administrator."
        : errorMessage.includes('not found')
        ? "Work order or user not found. Please refresh and try again."
        : errorMessage.includes('invalid')
        ? "Invalid assignment. The selected user may not be available."
        : "Failed to update work order assignment. Please check your connection and try again.";
      
      toast({
        title: "Assignment Failed",
        description: specificMessage,
        variant: "destructive",
      });
      
      showErrorToast(error, 'Work Order Assignment');
    }
  });

  const assignToUser = (userId: string, userName: string) => {
    updateAssignmentMutation.mutate({
      assigneeId: userId,
      assigneeName: userName
    });
  };

  const unassign = () => {
    updateAssignmentMutation.mutate({
      assigneeId: null,
      assigneeName: null
    });
  };

  return {
    assignmentOptions,
    optionsLoading,
    isUpdating: updateAssignmentMutation.isPending,
    assignToUser,
    unassign,
    updateAssignment: updateAssignmentMutation.mutate
  };
};
