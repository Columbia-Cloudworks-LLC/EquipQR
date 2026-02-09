/**
 * Places Autocomplete Service
 *
 * Service layer for interacting with the `places-autocomplete` Edge Function.
 * Keeps Supabase invocation logic out of UI components.
 */

import { supabase } from '@/integrations/supabase/client';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

// ── Types ────────────────────────────────────────────────────────

export interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// ── Service functions ────────────────────────────────────────────

/**
 * Fetch autocomplete predictions from the places-autocomplete Edge Function.
 */
export async function fetchPredictions(
  input: string,
  sessionToken?: string,
): Promise<Prediction[]> {
  const { data, error } = await supabase.functions.invoke('places-autocomplete', {
    body: { action: 'autocomplete', input, sessionToken },
  });
  if (error || !data?.predictions) return [];
  return data.predictions;
}

/**
 * Fetch place details (structured address) from the places-autocomplete Edge Function.
 */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceLocationData | null> {
  const { data, error } = await supabase.functions.invoke('places-autocomplete', {
    body: { action: 'details', placeId, sessionToken },
  });
  if (error || !data?.formatted_address) return null;
  return data as PlaceLocationData;
}
