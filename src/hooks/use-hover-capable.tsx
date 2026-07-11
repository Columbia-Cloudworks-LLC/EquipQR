import * as React from 'react';

const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';

const getServerSnapshot = () => false;

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(HOVER_CAPABLE_QUERY).matches;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const mql = window.matchMedia(HOVER_CAPABLE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

/**
 * True when the primary input supports hover and fine pointer (desktop mouse/trackpad).
 * False on touch-first devices where inline hover-pan would block page scroll.
 */
export function useHoverCapable() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
