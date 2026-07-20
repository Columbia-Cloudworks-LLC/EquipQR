/** Dashboard scrollport id from DashboardRouteLayout. */
export const MAIN_CONTENT_SCROLLPORT_ID = 'main-content';

export type ScrollMainContentToTopOptions = {
  /** Defaults to `auto` (instant). Use `smooth` after the card→details morph. */
  behavior?: ScrollBehavior;
};

function scrollElement(
  el: Element | null | undefined,
  behavior: ScrollBehavior,
): void {
  if (!el || !(el instanceof HTMLElement)) {
    return;
  }

  if (behavior === 'smooth' && typeof el.scrollTo === 'function') {
    el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return;
  }

  el.scrollTop = 0;
  el.scrollLeft = 0;
}

/**
 * Scrolls every relevant dashboard scrollport to the top.
 *
 * Depending on viewport/flex layout, equipment pages may scroll on
 * `#main-content`, `document.scrollingElement` (html), or both. Resetting only
 * one of them leaves the details page mid/bottom after a scrolled list click.
 */
export function scrollMainContentToTop(
  options: ScrollMainContentToTopOptions = {},
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const behavior = options.behavior ?? 'auto';

  scrollElement(document.getElementById(MAIN_CONTENT_SCROLLPORT_ID), behavior);
  scrollElement(document.scrollingElement, behavior);
  scrollElement(document.documentElement, behavior);
  scrollElement(document.body, behavior);

  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      // jsdom stubs scrollTo as "Not implemented"
    }
  }
}
