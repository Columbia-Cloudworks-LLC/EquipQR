import { useQuery } from '@tanstack/react-query';
import { getOptimizedWorkOrdersByOrganization } from '@/services/optimizedSupabaseDataService';

// OPTIMIZED: Better caching strategy and reduced refetch frequency
export const useOptimizedEnhancedWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['enhanced-work-orders-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedWorkOrdersByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes instead of 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // Don't always refetch on mount
    refetchInterval: false, // Disable automatic refetching
  });
};

