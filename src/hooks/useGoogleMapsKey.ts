import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleMapsKeyResponse {
  key?: string;
  /**
   * Cloud-managed Map ID enabling vector maps + Advanced Markers. Optional —
   * older deployments that have not set the GOOGLE_MAPS_MAP_ID Supabase
   * secret will receive `null` (or an absent field) and the Fleet Map will
   * fall back to a raster basemap.
   */
  mapId?: string | null;
  error?: string;
  details?: string;
}

interface UseGoogleMapsKeyOptions {
  enabled?: boolean;
}

interface UseGoogleMapsKeyResult {
  googleMapsKey: string;
  /** Cloud-managed Map ID; `null` until loaded or if not configured server-side. */
  mapId: string | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/** @internal Exported for unit tests and Fleet Map error copy */
export const GOOGLE_MAPS_AUTH_REQUIRED_MESSAGE =
  'Sign in required to load Google Maps.';

/** @internal Exported for unit tests */
export async function resolveAuthenticatedSession(): Promise<Session | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return null;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!userError && user) {
    return session;
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    return null;
  }

  return refreshed.session;
}

function isUnauthorizedFunctionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: string; status?: number; context?: { status?: number } };
  const status = candidate.status ?? candidate.context?.status;
  if (status === 401) {
    return true;
  }

  const message = candidate.message?.toLowerCase() ?? '';
  return message.includes('401') || message.includes('unauthorized');
}

/** @internal Exported for unit tests */
export async function invokePublicGoogleMapsKey(): Promise<GoogleMapsKeyResponse> {
  const cacheKey = `cache_bust_${Date.now()}`;

  const call = () =>
    supabase.functions.invoke<GoogleMapsKeyResponse>('public-google-maps-key', {
      body: { cache_bust: cacheKey },
    });

  let { data, error } = await call();

  if (error && isUnauthorizedFunctionError(error)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      ({ data, error } = await call());
    }
  }

  if (error) {
    console.error('[FleetMap] Edge function error object:', error);
    interface ErrorWithError {
      message?: string;
      error?: string;
    }
    const errorWithError = error as ErrorWithError;
    const errorMsg = error.message || errorWithError.error || JSON.stringify(error);
    throw new Error(`Edge function failed: ${errorMsg}`);
  }

  if (data?.error) {
    const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
    console.error('[FleetMap] Edge function returned error in data:', errorMsg);
    throw new Error(errorMsg);
  }

  if (!data?.key) {
    console.error('[FleetMap] No API key in response. Full response:', JSON.stringify(data, null, 2));
    throw new Error('Google Maps API key not found in response');
  }

  return data;
}

export const useGoogleMapsKey = (options: UseGoogleMapsKeyOptions = {}): UseGoogleMapsKeyResult => {
  const enabled = options.enabled ?? true;
  const [googleMapsKey, setGoogleMapsKey] = useState<string>('');
  const [mapId, setMapId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const fetchGoogleMapsKey = useCallback(async () => {
    if (!enabled || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;

    try {
      const session = await resolveAuthenticatedSession();
      if (!session?.access_token) {
        setGoogleMapsKey('');
        setMapId(null);
        setIsLoading(false);
        setError(GOOGLE_MAPS_AUTH_REQUIRED_MESSAGE);
        return;
      }

      setIsLoading(true);
      setError(null);

      const data = await invokePublicGoogleMapsKey();
      setGoogleMapsKey(data.key!);
      setMapId(data.mapId ?? null);
      setError(null);
    } catch (fetchError) {
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : 'Failed to fetch Google Maps key';
      console.error('[FleetMap] Failed to fetch Google Maps key:', fetchError);
      setError(errorMessage);

      toast.error('Map Configuration Error', {
        description: `${errorMessage}. Check that the GOOGLE_MAPS_BROWSER_KEY secret is configured on the Supabase project (legacy: VITE_GOOGLE_MAPS_BROWSER_KEY).`,
      });
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [enabled]);

  const authListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const cleanupAuthListener = () => {
      authListenerRef.current?.();
      authListenerRef.current = null;
    };

    const scheduleFetch = () => {
      queueMicrotask(() => {
        if (!cancelled) {
          void fetchGoogleMapsKey();
        }
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) {
        return;
      }

      if (
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.access_token
      ) {
        scheduleFetch();
      }
    });

    authListenerRef.current = () => subscription.unsubscribe();

    // Session-backed fetch is scheduled only via onAuthStateChange (INITIAL_SESSION,
    // SIGNED_IN, TOKEN_REFRESHED) to avoid duplicate mounts with resolveAuthenticatedSession.
    void resolveAuthenticatedSession().then((session) => {
      if (cancelled) {
        return;
      }

      if (!session?.access_token) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      cleanupAuthListener();
    };
  }, [enabled, fetchGoogleMapsKey]);

  return {
    googleMapsKey,
    mapId,
    isLoading,
    error,
    retry: fetchGoogleMapsKey,
  };
};
