import {
  clearEquipmentCardTransitionState,
  setEquipmentCardTransitionState,
} from '@/features/equipment/transitions/equipmentCardTransitionStore';
import type { ScrollMainContentToTopOptions } from '@/features/equipment/transitions/scrollMainContentToTop';
import { shouldEnableEquipmentViewTransition } from '@/features/equipment/transitions/supportsViewTransitions';
import { EQUIPMENT_CARD_VIEW_TRANSITION_FALLBACK_MS } from '@/features/equipment/transitions/waitForEquipmentViewTransition';

const EQUIPMENT_CARD_PREFETCH_TIMEOUT_MS = 800;

export type EquipmentCardTransitionDeps = {
  prefetch: (equipmentId: string) => Promise<unknown>;
  navigate: (to: string, opts?: { viewTransition?: boolean }) => void;
  scrollToTop: (opts?: ScrollMainContentToTopOptions) => void;
  reducedMotion: boolean;
  supportsViewTransition: boolean;
  waitForPaint?: () => Promise<void>;
  /** Resolves when the morph finishes — used only to clear VT names, not to delay scroll. */
  waitForViewTransition?: () => Promise<void>;
  prefetchTimeoutMs?: number;
  viewTransitionFallbackMs?: number;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

/**
 * Prefetch-then-navigate orchestrator for equipment card → details morph.
 *
 * Order: mark active → fade siblings → prefetch → navigate (morph) and
 * smooth-scroll simultaneously → wait for morph → clear transition state.
 */
export async function runEquipmentCardTransition(
  args: { equipmentId: string; to: string },
  deps: EquipmentCardTransitionDeps,
): Promise<void> {
  setEquipmentCardTransitionState({
    activeEquipmentId: args.equipmentId,
    isListTransitioning: true,
  });

  if (deps.waitForPaint) {
    await deps.waitForPaint();
  }

  const timeoutMs = deps.prefetchTimeoutMs ?? EQUIPMENT_CARD_PREFETCH_TIMEOUT_MS;
  await Promise.race([
    deps.prefetch(args.equipmentId).catch(() => undefined),
    delay(timeoutMs),
  ]);

  const viewTransition = shouldEnableEquipmentViewTransition(
    deps.reducedMotion,
    deps.supportsViewTransition,
  );

  deps.navigate(args.to, { viewTransition });

  // Scroll in parallel with the morph so the handoff feels faster.
  deps.scrollToTop({
    behavior: viewTransition ? 'smooth' : 'auto',
  });

  if (viewTransition) {
    if (deps.waitForViewTransition) {
      await deps.waitForViewTransition();
    } else {
      const fallbackMs =
        deps.viewTransitionFallbackMs ?? EQUIPMENT_CARD_VIEW_TRANSITION_FALLBACK_MS;
      await delay(fallbackMs);
    }
  }

  clearEquipmentCardTransitionState();
}
