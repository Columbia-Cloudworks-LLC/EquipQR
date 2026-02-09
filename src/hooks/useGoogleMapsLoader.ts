/**
 * Shared Google Maps JS API loader hook.
 *
 * Uses the Loader from @googlemaps/js-api-loader under the hood via a
 * module-level singleton so that every consumer (MapView,
 * GooglePlacesAutocomplete, etc.) shares a single script load regardless
 * of how many React components call this hook.
 */

import { useState, useEffect, useRef } from 'react';
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

async function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Already loaded with this key
  if (globalIsLoaded && globalLoadedKey === apiKey) return;

  // Already loading
  if (globalLoadPromise && globalLoadedKey === apiKey) return globalLoadPromise;

  globalLoadedKey = apiKey;
  globalLoadError = undefined;

  globalLoadPromise = new Promise<void>((resolve, reject) => {
    // If already loaded by another mechanism (e.g. previous session), skip
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      globalIsLoaded = true;
      notify();
      resolve();
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existingScript) {
      // Script tag exists – wait for it to finish
      if (typeof google !== 'undefined' && google.maps) {
        globalIsLoaded = true;
        notify();
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => {
        globalIsLoaded = true;
        notify();
        resolve();
      });
      existingScript.addEventListener('error', () => {
        globalLoadError = new Error('Failed to load Google Maps script');
        notify();
        reject(globalLoadError);
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
      globalIsLoaded = true;
      notify();
      resolve();
    };

    script.onerror = () => {
      globalLoadError = new Error('Failed to load Google Maps script');
      notify();
      reject(globalLoadError);
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
}

export const useGoogleMapsLoader = (): UseGoogleMapsLoaderResult => {
  const {
    googleMapsKey,
    isLoading: isKeyLoading,
    error: keyError,
  } = useGoogleMapsKey();

  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>(globalLoadError);
  const triggeredRef = useRef(false);

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

  // Trigger script loading once we have a key
  useEffect(() => {
    if (!googleMapsKey || triggeredRef.current) return;
    triggeredRef.current = true;
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
  };
};
