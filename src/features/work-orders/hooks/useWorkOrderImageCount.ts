import { useQuery } from '@tanstack/react-query';
import { getWorkOrderImageCount } from '@/features/work-orders/services/deleteWorkOrderService';
import { workOrderMetrics } from '@/lib/queryKeys';

export const useWorkOrderImageCount = (workOrderId: string) => {
  return useQuery({
    queryKey: workOrderMetrics.imageCount(workOrderId),
    queryFn: () => getWorkOrderImageCount(workOrderId),
    enabled: !!workOrderId,
  });
};
