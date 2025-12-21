import { useQuery } from '@tanstack/react-query';
import { getWorkOrderImageCount } from '@/features/work-orders/services/deleteWorkOrderService';

export const useWorkOrderImageCount = (workOrderId: string) => {
  return useQuery({
    queryKey: ['workOrderImageCount', workOrderId],
    queryFn: () => getWorkOrderImageCount(workOrderId),
    enabled: !!workOrderId,
  });
};
