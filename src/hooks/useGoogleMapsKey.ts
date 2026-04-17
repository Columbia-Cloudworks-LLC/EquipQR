import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleMapsKeyResponse {
  key?: string;
  error?: string;
  details?: string;
}

interface UseGoogleMapsKeyResult {
  googleMapsKey: string;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export const useGoogleMapsKey = (): UseGoogleMapsKeyResult => {
  const [googleMapsKey, setGoogleMapsKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debugLog = (hypothesisId: string, message: string, data: Record<string, unknown>) => {
    fetch('http://127.0.0.1:7523/ingest/28f3b63b-7486-4e03-bcb4-f64564328ea9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2c818f'},body:JSON.stringify({sessionId:'2c818f',runId:'initial',hypothesisId,location:'src/hooks/useGoogleMapsKey.ts',message,data,timestamp:Date.now()})}).catch(()=>{});
  };

  const fetchGoogleMapsKey = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add cache busting parameter to force fresh request
      const cacheKey = `cache_bust_${Date.now()}`;
      // Fetching Google Maps key
      // #region agent log
      debugLog('H2', 'Invoking public-google-maps-key edge function', {
        hasCachedKey: Boolean(googleMapsKey),
        cacheKey,
      });
      // #endregion agent log
      
      const { data, error } = await supabase.functions.invoke<GoogleMapsKeyResponse>(
        'public-google-maps-key',
        {
          body: { cache_bust: cacheKey }
        }
      );
      
      if (error) {
        console.error('[FleetMap] Edge function error object:', error);
        const functionError = error as {
          name?: string;
          message?: string;
          context?: Response;
        };
        const responseStatus =
          functionError.context instanceof Response ? functionError.context.status : null;
        const responseBody =
          functionError.context instanceof Response
            ? await functionError.context.clone().text().catch(() => null)
            : null;
        // #region agent log
        debugLog('H7', 'Edge function invoke returned error object', {
          errorName: functionError.name ?? null,
          errorMessage: functionError.message ?? null,
          responseStatus,
          responseBodySnippet: responseBody ? responseBody.slice(0, 200) : null,
        });
        // #endregion agent log
        // Extract error message from various possible locations
        interface ErrorWithError {
          message?: string;
          error?: string;
        }
        const errorWithError = error as ErrorWithError;
        const errorMsg = error.message || errorWithError.error || JSON.stringify(error);
        throw new Error(`Edge function failed: ${errorMsg}`);
      }
      
      // Check if the response contains an error (edge function returned error in data)
      if (data?.error) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        console.error('[FleetMap] Edge function returned error in data:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!data?.key) {
        console.error('[FleetMap] No API key in response. Full response:', JSON.stringify(data, null, 2));
        throw new Error('Google Maps API key not found in response');
      }
      
      // Successfully fetched Google Maps key
      // #region agent log
      debugLog('H2', 'Google Maps key fetch succeeded', {
        hasKey: Boolean(data.key),
        keyLength: data.key.length,
      });
      // #endregion agent log
      setGoogleMapsKey(data.key);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Google Maps key';
      console.error('[FleetMap] Failed to fetch Google Maps key:', error);
      // #region agent log
      debugLog('H2', 'Google Maps key fetch failed', {
        errorMessage,
      });
      // #endregion agent log
      setError(errorMessage);
      
      // Show detailed error to help with debugging
      toast.error('Map Configuration Error', {
        description: `${errorMessage}. Check that the VITE_GOOGLE_MAPS_BROWSER_KEY secret is configured in Supabase.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleMapsKey();
  }, []);

  return {
    googleMapsKey,
    isLoading,
    error,
    retry: fetchGoogleMapsKey,
  };
};