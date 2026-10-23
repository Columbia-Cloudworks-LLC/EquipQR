import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getOrganizationEquipmentSpecCache,
  upsertOrganizationEquipmentSpecCache,
} from '@/features/equipment/services/equipmentSpecInferenceService';
import type { SpecInferenceSource } from '@/features/equipment/data/equipmentTaxonomySeed';

export const equipmentSpecCacheKey = (organizationId: string) =>
  ['equipment-spec-cache', organizationId] as const;

export function useOrganizationEquipmentSpecCache(organizationId: string | undefined) {
  return useQuery({
    queryKey: equipmentSpecCacheKey(organizationId ?? ''),
    queryFn: async () => {
      if (!organizationId) return [];
      return await getOrganizationEquipmentSpecCache(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordAcceptedEquipmentSpec() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      manufacturer: string;
      model: string;
      category?: string | null;
      subtype?: string | null;
      specs?: Record<string, string>;
      source?: SpecInferenceSource;
      confidence?: number;
    }) => {
      if (!user) return;
      await upsertOrganizationEquipmentSpecCache({
        ...params,
        userId: user.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: equipmentSpecCacheKey(variables.organizationId),
      });
    },
  });
}
