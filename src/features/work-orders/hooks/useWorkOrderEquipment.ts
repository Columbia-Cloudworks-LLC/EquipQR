// Hooks for managing work order equipment relationships
import { useQuery } from '@tanstack/react-query';
import { getWorkOrderEquipment } from '@/features/work-orders/services/workOrderEquipmentService';
import { workOrderEquipment } from '@/lib/queryKeys';

/**
 * Hook to fetch all equipment linked to a work order
 */
export const useWorkOrderEquipment = (workOrderId: string) => {
  return useQuery({
    queryKey: workOrderEquipment.byWorkOrder(workOrderId),
    queryFn: () => getWorkOrderEquipment(workOrderId),
    enabled: !!workOrderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
