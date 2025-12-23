
import { useQuery } from '@tanstack/react-query';
import { getWorkOrderCosts } from '@/features/work-orders/services/workOrderCostsService';

export const useWorkOrderCostsSubtotal = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-costs-subtotal', workOrderId],
    queryFn: async () => {
      const costs = await getWorkOrderCosts(workOrderId);
      const subtotal = costs.reduce((sum, cost) => sum + cost.total_price_cents, 0);
      return subtotal;
    },
    enabled: !!workOrderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
