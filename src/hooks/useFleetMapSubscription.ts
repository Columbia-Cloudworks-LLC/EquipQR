
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showErrorToast } from '@/utils/errorHandling';

export interface FleetMapSubscription {
  enabled: boolean;
  active: boolean;
  status: 'active' | 'inactive' | 'cancelled';
  currentPeriodEnd?: string;
}

export const useFleetMapSubscription = (organizationId: string) => {
  return useQuery({
    queryKey: ['fleet-map-subscription', organizationId],
    queryFn: async (): Promise<FleetMapSubscription> => {
      if (!organizationId) {
        return { enabled: false, active: false, status: 'inactive' };
      }

      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('feature_type', 'fleet_map')
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        showErrorToast(error, 'Fleet Map Subscription Check');
        return { enabled: false, active: false, status: 'inactive' };
      }

      const isActive = !!data;
      return {
        enabled: isActive,
        active: isActive,
        status: (data?.status as 'active' | 'inactive' | 'cancelled') || 'inactive',
        currentPeriodEnd: data?.current_period_end
      };
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};
