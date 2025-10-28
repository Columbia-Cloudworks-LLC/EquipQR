
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  getPMByWorkOrderId,
  getPMByWorkOrderAndEquipment,
  getPMsByWorkOrderId,
  updatePM,
  UpdatePMData,
} from '@/services/preventativeMaintenanceService';
import { toast } from 'sonner';

// Legacy hook - returns first PM found
export const usePMByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', workOrderId],
    queryFn: () => getPMByWorkOrderId(workOrderId),
    enabled: !!workOrderId && !!currentOrganization,
  });
};

// Multi-equipment support - get PM by work order AND equipment
export const usePMByWorkOrderAndEquipment = (workOrderId: string, equipmentId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', workOrderId, equipmentId],
    queryFn: () => getPMByWorkOrderAndEquipment(workOrderId, equipmentId),
    enabled: !!workOrderId && !!equipmentId && !!currentOrganization,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get all PMs for a work order (all equipment)
export const usePMsByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', 'all', workOrderId],
    queryFn: () => getPMsByWorkOrderId(workOrderId),
    enabled: !!workOrderId && !!currentOrganization,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdatePM = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pmId, data }: { pmId: string; data: UpdatePMData }) => {
      return await updatePM(pmId, data);
    },
    onSuccess: (updatedPM, variables) => {
      if (updatedPM) {
        queryClient.invalidateQueries({ 
          queryKey: ['preventativeMaintenance', updatedPM.work_order_id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workOrder'] 
        });
        toast.success('PM updated successfully');
      }
    },
    onError: (error) => {
      console.error('Error updating PM:', error);
      toast.error('Failed to update PM');
    },
  });
};
