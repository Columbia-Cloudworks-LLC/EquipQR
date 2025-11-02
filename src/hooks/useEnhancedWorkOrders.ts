
import { useQuery } from '@tanstack/react-query';
import { getEnhancedWorkOrdersByOrganization } from '@/services/workOrdersEnhancedService';

export const useEnhancedWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['enhanced-work-orders', organizationId],
    queryFn: () => organizationId ? getEnhancedWorkOrdersByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - reduced for more frequent updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnMount: true, // Always refetch when component mounts
  });
};
