import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OptimizedOrganizationStorageService, type StorageUsage } from '@/services/optimizedOrganizationStorageService';

export type { StorageUsage };

/**
 * Optimized hook for fetching organization storage usage
 * Uses server-side aggregation and proper organization filtering
 */
export const useOrganizationStorageUsage = (organizationId?: string) => {
  const { currentOrganization } = useOrganization();
  
  // Use provided organizationId or fall back to current organization
  const targetOrgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: ['organization-storage-usage-optimized', targetOrgId],
    queryFn: async (): Promise<StorageUsage> => {
      if (!targetOrgId) {
        throw new Error('No organization selected');
      }

      return OptimizedOrganizationStorageService.getOrganizationStorageUsage(
        targetOrgId
      );
    },
    enabled: !!targetOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - increased for better performance
    refetchInterval: 10 * 60 * 1000, // 10 minutes - reduced frequency
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook for getting detailed storage breakdown by type
 */
export const useDetailedStorageBreakdown = (organizationId?: string) => {
  const { currentOrganization } = useOrganization();
  
  // Use provided organizationId or fall back to current organization
  const targetOrgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: ['organization-storage-breakdown', targetOrgId],
    queryFn: async () => {
      if (!targetOrgId) {
        throw new Error('No organization selected');
      }

      return OptimizedOrganizationStorageService.getDetailedStorageBreakdown(
        targetOrgId
      );
    },
    enabled: !!targetOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });
};
