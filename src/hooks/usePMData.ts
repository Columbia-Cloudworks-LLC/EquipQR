
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  getPMByWorkOrderId,
  getPMByWorkOrderAndEquipment,
  getPMsByWorkOrderId,
  updatePM,
  UpdatePMData,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { toast } from 'sonner';

// Legacy hook - returns first PM found
export const usePMByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', workOrderId, currentOrganization?.id],
    queryFn: () => getPMByWorkOrderId(workOrderId, currentOrganization!.id),
    enabled: !!workOrderId && !!currentOrganization?.id,
  });
};

// Multi-equipment support - get PM by work order AND equipment
export const usePMByWorkOrderAndEquipment = (workOrderId: string, equipmentId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', workOrderId, equipmentId, currentOrganization?.id],
    queryFn: () => getPMByWorkOrderAndEquipment(workOrderId, equipmentId, currentOrganization!.id),
    enabled: !!workOrderId && !!equipmentId && !!currentOrganization?.id,
    staleTime: 0, // Data is immediately stale - always refetch on mount after changes
    // Keep data even if refetch fails - don't clear on error
    retry: 1,
    retryOnMount: true, // Refetch on mount to ensure we have latest data
    // Prevent clearing data on refetch failure
    refetchOnWindowFocus: false,
    // Keep previous data when query fails - prevents clearing on 406 errors
    placeholderData: (previousData) => previousData,
  });
};

// Get all PMs for a work order (all equipment)
export const usePMsByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', 'all', workOrderId, currentOrganization?.id],
    queryFn: () => getPMsByWorkOrderId(workOrderId, currentOrganization!.id),
    enabled: !!workOrderId && !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdatePM = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({ pmId, data }: { pmId: string; data: UpdatePMData }) => {
      return await updatePM(pmId, data);
    },
    onSuccess: (updatedPM) => {
      if (updatedPM && currentOrganization?.id) {
        // Update specific query cache immediately with returned data
        queryClient.setQueryData(
          ['preventativeMaintenance', updatedPM.work_order_id, updatedPM.equipment_id, currentOrganization.id],
          updatedPM
        );
        
        // Invalidate related queries to ensure fresh data on next load
        queryClient.invalidateQueries({ 
          queryKey: ['preventativeMaintenance', updatedPM.work_order_id],
          exact: false,
          refetchType: 'active' // Refetch active queries to get updated data
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workOrder'],
          exact: false,
          refetchType: 'active' // OK to refetch work orders
        });
        
        // Only show toast if not already shown by caller
        // (Some callers like handleSetAllToOK show their own toast)
      }
    },
    onError: (error) => {
      console.error('Error updating PM:', error);
      toast.error('Failed to update PM');
    },
  });
};
