import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { dfyProvisioning } from '@/features/dfy/services/dfyProvisioningService';

/**
 * Whether the signed-in user is an EquipQR operator. Only hides UI: every
 * provisioning action is re-checked by the dfy-provisioning Edge Function.
 */
export function useIsDfyOperator(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dfy-operator', user?.id],
    queryFn: async () => (await dfyProvisioning.whoami()).isOperator,
    enabled: enabled && Boolean(user?.id),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
