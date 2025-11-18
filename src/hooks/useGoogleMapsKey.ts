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

  const fetchGoogleMapsKey = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add cache busting parameter to force fresh request
      const cacheKey = `cache_bust_${Date.now()}`;
      // Fetching Google Maps key
      
      const { data, error } = await supabase.functions.invoke<GoogleMapsKeyResponse>(
        'public-google-maps-key',
        {
          body: { cache_bust: cacheKey }
        }
      );
      
      console.log('[FleetMap] Edge function response:', { 
        data: JSON.stringify(data), 
        error, 
        hasData: !!data, 
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : []
      });
      
      if (error) {
        console.error('[FleetMap] Edge function error object:', error);
        // Extract error message from various possible locations
        const errorMsg = error.message || (error as any)?.error || JSON.stringify(error);
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
      setGoogleMapsKey(data.key);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Google Maps key';
      console.error('[FleetMap] Failed to fetch Google Maps key:', error);
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