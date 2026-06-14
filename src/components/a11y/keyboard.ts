import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

/**
 * Focuses an element once on mount. Prefer over the autoFocus attribute for WCAG-friendly
 * focus management (avoids stealing focus on unexpected re-renders).
 */
export function useMountFocus<T extends HTMLElement>(enabled = true): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (enabled) {
      ref.current?.focus();
    }
  }, [enabled]);

  return ref;
}

/** Invokes action when Enter or Space is pressed (button-like keyboard activation). */
export function handleKeyboardActivation(
  event: KeyboardEvent,
  action: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}
