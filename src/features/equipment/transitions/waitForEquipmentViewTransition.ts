/** Fallback wait when `document.activeViewTransition` is missing (CSS morph ~450ms). */
export const EQUIPMENT_CARD_VIEW_TRANSITION_FALLBACK_MS = 500;

type DocumentWithViewTransition = Document & {
  activeViewTransition?: { finished: Promise<unknown> } | null;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Waits until the active document View Transition finishes (morph complete),
 * or until `fallbackMs` elapses when no transition is active.
 *
 * React Router starts the transition asynchronously after `navigate()`, so we
 * paint once before reading `document.activeViewTransition`.
 */
export async function waitForEquipmentViewTransition(
  fallbackMs: number = EQUIPMENT_CARD_VIEW_TRANSITION_FALLBACK_MS,
): Promise<void> {
  await waitForNextPaint();

  if (typeof document === 'undefined') {
    await delay(fallbackMs);
    return;
  }

  const active = (document as DocumentWithViewTransition).activeViewTransition;
  if (active?.finished) {
    await Promise.race([
      active.finished.then(() => undefined).catch(() => undefined),
      delay(fallbackMs + 200),
    ]);
    return;
  }

  await delay(fallbackMs);
}
