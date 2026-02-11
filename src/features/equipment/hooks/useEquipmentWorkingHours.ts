import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEquipmentWorkingHoursHistory,
  getEquipmentCurrentWorkingHours,
} from '@/features/equipment/services/equipmentWorkingHoursService';
import type { UpdateWorkingHoursData } from '@/features/equipment/services/equipmentWorkingHoursService';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { toast } from 'sonner';

export const useEquipmentWorkingHoursHistory = (
  equipmentId: string, 
  page: number = 1, 
  pageSize: number = 10
) => {
  return useQuery({
    queryKey: ['equipment-working-hours-history', equipmentId, page, pageSize],
    queryFn: () => getEquipmentWorkingHoursHistory(equipmentId, page, pageSize),
    enabled: !!equipmentId,
  });
};

export const useEquipmentCurrentWorkingHours = (equipmentId: string) => {
  return useQuery({
    queryKey: ['equipment-current-working-hours', equipmentId],
    queryFn: () => getEquipmentCurrentWorkingHours(equipmentId),
    enabled: !!equipmentId,
  });
};

export const useUpdateEquipmentWorkingHours = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async (data: UpdateWorkingHoursData) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }
      const service = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      return service.updateWorkingHours(data);
    },
    onSuccess: (result, variables) => {
      if (result.queuedOffline) {
        toast.success('Saved offline — working hours will sync when you reconnect.');
        offlineCtx?.refresh();
      } else {
        toast.success('Equipment working hours updated successfully');
        queryClient.invalidateQueries({
          queryKey: ['equipment-working-hours-history', variables.equipmentId],
        });
        queryClient.invalidateQueries({
          queryKey: ['equipment-current-working-hours', variables.equipmentId],
        });
        queryClient.invalidateQueries({
          queryKey: ['equipment'],
          exact: false,
        });
      }
    },
    onError: (error) => {
      console.error('Error updating working hours:', error);
      toast.error('Failed to update equipment working hours');
    },
  });
};