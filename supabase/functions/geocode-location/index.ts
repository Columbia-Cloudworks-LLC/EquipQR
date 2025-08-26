
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GEOCODE-LOCATION] ${step}${detailsStr}`);
};

// Normalize address text (must match client-side logic)
function normalizeAddress(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { organizationId, input } = await req.json();
    if (!organizationId || !input) {
      throw new Error("organizationId and input are required");
    }

    const normalizedInput = normalizeAddress(input);
    if (!normalizedInput) {
      return new Response(JSON.stringify({ lat: null, lng: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Checking cache", { organizationId, normalizedInput });

    // Check cache first
    const { data: cached, error: cacheError } = await supabaseClient
      .from('geocoded_locations')
      .select('latitude, longitude, formatted_address')
      .eq('organization_id', organizationId)
      .eq('normalized_text', normalizedInput)
      .maybeSingle();

    if (cacheError) {
      logStep("Cache check error", { error: cacheError.message });
    } else if (cached) {
      logStep("Cache hit");
      return new Response(JSON.stringify({
        lat: cached.latitude,
        lng: cached.longitude,
        formatted_address: cached.formatted_address
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Cache miss, calling Google API");

    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${googleApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
      logStep("Google API returned no results", { status: geocodeData.status });
      return new Response(JSON.stringify({ lat: null, lng: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const result = geocodeData.results[0];
    const location = result.geometry.location;
    const lat = location.lat;
    const lng = location.lng;
    const formattedAddress = result.formatted_address;

    logStep("Google API success", { lat, lng, formattedAddress });

    // Cache the result
    const { error: insertError } = await supabaseClient
      .from('geocoded_locations')
      .upsert({
        organization_id: organizationId,
        input_text: input,
        normalized_text: normalizedInput,
        latitude: lat,
        longitude: lng,
        formatted_address: formattedAddress
      }, {
        onConflict: 'organization_id,normalized_text'
      });

    if (insertError) {
      logStep("Cache insert error", { error: insertError.message });
    } else {
      logStep("Cached result");
    }

    return new Response(JSON.stringify({
      lat,
      lng,
      formatted_address: formattedAddress
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
