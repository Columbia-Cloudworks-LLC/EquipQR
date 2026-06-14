import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { productOnboarding } from '@/lib/queryKeys/organization';
import {
  completeProductOnboarding,
  getProductOnboardingStatus,
} from '@/features/onboarding/services/productOnboardingService';

export function useProductOnboardingStatus() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: productOnboarding(organizationId ?? '', userId ?? ''),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization context is required for onboarding status');
      }
      return getProductOnboardingStatus(organizationId);
    },
    enabled: Boolean(organizationId && userId),
  });
}

export function useCompleteProductOnboarding() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: () => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      return completeProductOnboarding(organizationId);
    },
    onSuccess: async () => {
      const queryKey = productOnboarding(organizationId ?? '', userId);
      queryClient.setQueryData(queryKey, (previous) => {
        if (!previous) {
          return {
            needs_onboarding: false,
            teams_count: 1,
            equipment_count: 1,
            completed_at: new Date().toISOString(),
            is_org_admin: true,
          };
        }
        return {
          ...previous,
          needs_onboarding: false,
          completed_at: previous.completed_at ?? new Date().toISOString(),
        };
      });
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
