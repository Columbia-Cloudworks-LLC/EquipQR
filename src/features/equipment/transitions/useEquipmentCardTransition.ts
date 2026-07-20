import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { equipment as equipmentKeys } from '@/lib/queryKeys';
import { runEquipmentCardTransition } from '@/features/equipment/transitions/runEquipmentCardTransition';
import { scrollMainContentToTop } from '@/features/equipment/transitions/scrollMainContentToTop';
import { supportsViewTransitions } from '@/features/equipment/transitions/supportsViewTransitions';
import { useEquipmentCardTransitionState } from '@/features/equipment/transitions/useEquipmentCardTransitionState';
import { waitForEquipmentViewTransition } from '@/features/equipment/transitions/waitForEquipmentViewTransition';

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Starts the list → details morph: sibling fade, detail prefetch, navigate,
 * and smooth-scroll simultaneously with the morph.
 */
export function useEquipmentCardTransition() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const organization = useSimpleOrganizationSafe();
  const reducedMotion = usePrefersReducedMotion();
  const state = useEquipmentCardTransitionState();

  const beginTransition = async (args: { equipmentId: string; to: string }) => {
    const orgId = organization?.currentOrganization?.id;

    await runEquipmentCardTransition(args, {
      prefetch: async (equipmentId) => {
        if (!orgId) {
          return;
        }

        await queryClient.prefetchQuery({
          queryKey: equipmentKeys.byId(orgId, equipmentId),
          queryFn: async () => {
            const result = await EquipmentService.getById(orgId, equipmentId);
            if (result.success && result.data) {
              return result.data;
            }
            throw new Error(result.error || 'Equipment not found');
          },
        });
      },
      navigate: (to, opts) => {
        navigate(to, opts);
      },
      scrollToTop: scrollMainContentToTop,
      reducedMotion,
      supportsViewTransition: supportsViewTransitions(),
      waitForPaint: waitForNextPaint,
      waitForViewTransition: waitForEquipmentViewTransition,
    });
  };

  return {
    ...state,
    beginTransition,
  };
}
