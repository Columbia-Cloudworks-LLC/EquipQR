/**
 * Shared Google Maps JS API loader hook.
 *
 * Uses a module-level singleton so that every consumer (MapView,
 * GooglePlacesAutocomplete, etc.) shares a single script load regardless
 * of how many React components call this hook.
 *
 * On transient failures the singleton resets automatically so the next
 * call to `retry()` (or a component remount) can re-attempt loading
 * without a full page reload.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';

// ── Module-level singleton state ──────────────────────────────
let globalIsLoaded = false;
let globalLoadError: Error | undefined;
let globalLoadPromise: Promise<void> | null = null;
let globalLoadedKey = '';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/**
 * Returns true when the Google Maps JS API **and** the Places library
 * are both available on the global `google` object.
 */
function isMapsFullyLoaded(): boolean {
  return (
    typeof google !== 'undefined' &&
    !!google.maps &&
    !!google.maps.places
  );
}

/**
 * Remove a failed script element from the DOM so a subsequent retry can
 * insert a fresh one.  Leaves the DOM untouched if no matching element
 * exists.
 */
function removeGoogleMapsScript(): void {
  const el = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"], script#google-maps-script',
  );
  if (el) {
    el.remove();
  }
}

/**
 * Reset all module-level state so the next `loadGoogleMapsScript` call
 * starts from scratch.  Called automatically on failure and exposed
 * indirectly to consumers via the `retry()` return value.
 */
function resetGlobalState(): void {
  globalIsLoaded = false;
  globalLoadError = undefined;
  globalLoadPromise = null;
  globalLoadedKey = '';
  removeGoogleMapsScript();
  notify();
}

/**
 * Handle a load failure: persist the error, reset retriable state, and
 * notify subscribers.
 */
function handleLoadFailure(error: Error): void {
  globalLoadError = error;
  globalIsLoaded = false;
  globalLoadPromise = null;
  // Don't clear globalLoadedKey here — it prevents a *concurrent*
  // re-entry from racing.  The key is cleared on explicit retry().
  removeGoogleMapsScript();
  notify();
}

async function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Already loaded with this key
  if (globalIsLoaded && globalLoadedKey === apiKey && isMapsFullyLoaded()) {
    return;
  }

  // Already loading (and not failed)
  if (globalLoadPromise && globalLoadedKey === apiKey) return globalLoadPromise;

  globalLoadedKey = apiKey;
  globalLoadError = undefined;

  globalLoadPromise = new Promise<void>((resolve, reject) => {
    // If already loaded by another mechanism (e.g. previous session), skip
    if (isMapsFullyLoaded()) {
      globalIsLoaded = true;
      notify();
      resolve();
      return;
    }

    // Check if a script tag already exists (e.g. injected by a third party)
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existingScript) {
      // Script tag exists — but only resolve when the full API is available,
      // including the Places library we depend on.
      if (isMapsFullyLoaded()) {
        globalIsLoaded = true;
        notify();
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => {
        if (isMapsFullyLoaded()) {
          globalIsLoaded = true;
          notify();
          resolve();
        } else {
          const err = new Error(
            'Google Maps script loaded but the Places library is missing',
          );
          handleLoadFailure(err);
          reject(err);
        }
      });
      existingScript.addEventListener('error', () => {
        const err = new Error('Failed to load Google Maps script');
        handleLoadFailure(err);
        reject(err);
      });
      return;
    }

    // Create the script tag ourselves
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    script.onload = () => {
      if (isMapsFullyLoaded()) {
        globalIsLoaded = true;
        notify();
        resolve();
      } else {
        const err = new Error(
          'Google Maps script loaded but the Places library is missing',
        );
        handleLoadFailure(err);
        reject(err);
      }
    };

    script.onerror = () => {
      const err = new Error('Failed to load Google Maps script');
      handleLoadFailure(err);
      reject(err);
    };

    document.head.appendChild(script);
  });

  return globalLoadPromise;
}

// ── React hook ────────────────────────────────────────────────

export interface UseGoogleMapsLoaderResult {
  /** true once the Google Maps JS API is fully loaded */
  isLoaded: boolean;
  /** non-null when the script failed to load */
  loadError: Error | undefined;
  /** the browser-side API key (empty string while still fetching) */
  googleMapsKey: string;
  /** true while the API key is being fetched from the edge function */
  isKeyLoading: boolean;
  /** non-null when fetching the key itself failed */
  keyError: string | null;
  /** Call to clear the error state and re-attempt loading */
  retry: () => void;
}

export const useGoogleMapsLoader = (): UseGoogleMapsLoaderResult => {
  const {
    googleMapsKey,
    isLoading: isKeyLoading,
    error: keyError,
  } = useGoogleMapsKey();

  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>(globalLoadError);

  // Subscribe to global state changes
  useEffect(() => {
    const update = () => {
      setIsLoaded(globalIsLoaded);
      setLoadError(globalLoadError);
    };
    listeners.add(update);
    // Sync immediately in case we missed an update
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  // Trigger script loading once we have a key and it isn't already loaded
  useEffect(() => {
    if (!googleMapsKey || globalIsLoaded || globalLoadPromise) return;
    loadGoogleMapsScript(googleMapsKey).catch(() => {
      // Error is captured in globalLoadError and will be synced via listener
    });
  }, [googleMapsKey]);

  // Explicit retry: reset everything and re-trigger
  const retry = useCallback(() => {
    if (!googleMapsKey) return;
    resetGlobalState();
    loadGoogleMapsScript(googleMapsKey).catch(() => {
      // Error is captured in globalLoadError and will be synced via listener
    });
  }, [googleMapsKey]);

  return {
    isLoaded: isLoaded && !!googleMapsKey,
    loadError,
    googleMapsKey,
    isKeyLoading,
    keyError,
    retry,
  };
};
