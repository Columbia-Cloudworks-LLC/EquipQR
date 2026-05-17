import { useEffect, useRef, type FC } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Announces SPA navigations to assistive tech and moves focus to the primary route heading.
 * Skips announcements for hash-only navigations on `/` (same-page section jumps).
 */
export const RouteAnnouncer: FC = () => {
  const location = useLocation();
  const prevRef = useRef<{ pathname: string; search: string; hash: string } | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { pathname, search, hash } = location;
    const prev = prevRef.current;

    if (!prev) {
      prevRef.current = { pathname, search, hash };
      return;
    }

    const pathnameChanged = prev.pathname !== pathname;
    const searchChanged = prev.search !== search;
    const hashChanged = prev.hash !== hash;

    const hashOnlyOnHome =
      pathname === '/' &&
      prev.pathname === '/' &&
      !pathnameChanged &&
      !searchChanged &&
      hashChanged;

    if (hashOnlyOnHome) {
      prevRef.current = { pathname, search, hash };
      return;
    }

    if (!pathnameChanged && !searchChanged && !hashChanged) {
      prevRef.current = { pathname, search, hash };
      return;
    }

    prevRef.current = { pathname, search, hash };

    const stripEquipQrSuffix = (t: string): string => {
      const suffix = ' | EquipQR';
      return t.endsWith(suffix) ? t.slice(0, -suffix.length).trim() : t.trim();
    };

    const message = `Navigated to ${stripEquipQrSuffix(document.title) || pathname}`;

    const region = regionRef.current;
    if (region) {
      region.textContent = '';
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    }

    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('[data-route-heading="true"]');
      if (heading) {
        heading.focus({ preventScroll: true });
      } else {
        document.getElementById('main-content')?.focus({ preventScroll: true });
      }
    });
  }, [location]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
};
