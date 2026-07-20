import { useLayoutEffect } from 'react';
import { getEquipmentCardTransitionState } from '@/features/equipment/transitions/equipmentCardTransitionStore';
import { scrollMainContentToTop } from '@/features/equipment/transitions/scrollMainContentToTop';

/**
 * Forces dashboard/document scrollports to the top whenever `dependency` changes
 * (typically equipmentId on the details page).
 *
 * Skips entirely while a card→details morph is in progress for this equipment —
 * `runEquipmentCardTransition` owns the parallel smooth scroll so we do not
 * fight it with an instant jump.
 */
export function useScrollMainContentToTopOnMount(dependency: string | undefined): void {
  useLayoutEffect(() => {
    if (!dependency) {
      return;
    }

    const transition = getEquipmentCardTransitionState();
    if (
      transition.isListTransitioning &&
      transition.activeEquipmentId === dependency
    ) {
      return;
    }

    scrollMainContentToTop({ behavior: 'auto' });

    const frame = requestAnimationFrame(() => {
      scrollMainContentToTop({ behavior: 'auto' });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [dependency]);
}
