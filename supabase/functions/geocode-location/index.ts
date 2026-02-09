/**
 * Geocode Location Edge Function
 * 
 * Geocodes an address using Google Maps API and caches results.
 * Requires authenticated user (verify_jwt=true in config.toml).
 * Uses user-scoped client so RLS policies apply to geocoded_locations table.
 */

import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgMembership,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GEOCODE-LOCATION] ${step}${detailsStr}`);
};

// Normalize address text (must match client-side logic)
function normalizeAddress(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

interface GeocodeRequest {
  organizationId: string;
  input: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body: GeocodeRequest = await req.json();
    const { organizationId, input } = body;

    if (!organizationId || !input) {
      return createErrorResponse("organizationId and input are required", 400);
    }

    // Verify user is member of the organization (defense-in-depth; RLS also applies)
    const membership = await verifyOrgMembership(supabase, user.id, organizationId);
    if (!membership.isMember) {
      logStep("Org membership denied", { userId: user.id, orgId: organizationId });
      return createErrorResponse("You are not a member of this organization", 403);
    }

    const normalizedInput = normalizeAddress(input);
    if (!normalizedInput) {
      return createJsonResponse({ lat: null, lng: null });
    }

    // Rate limiting: max 30 geocode cache misses per user per minute.
    // We count recent inserts into geocoded_locations (which only happen on
    // cache misses that call the Google API). Cache hits are free.
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitError } = await supabase
      .from("geocoded_locations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneMinuteAgo);

    if (!rateLimitError && (recentCount ?? 0) >= 30) {
      logStep("Rate limit exceeded", { userId: user.id, recentCount });
      return createErrorResponse("Rate limit exceeded", 429);
    }

    logStep("Checking cache", { organizationId, normalizedInput });

    // Check cache first (RLS will restrict to user's orgs)
    const { data: cached, error: cacheError } = await supabase
      .from("geocoded_locations")
      .select("latitude, longitude, formatted_address")
      .eq("organization_id", organizationId)
      .eq("normalized_text", normalizedInput)
      .maybeSingle();

    if (cacheError) {
      logStep("Cache check error", { error: cacheError.message });
    } else if (cached) {
      logStep("Cache hit");
      return createJsonResponse({
        lat: cached.latitude,
        lng: cached.longitude,
        formatted_address: cached.formatted_address,
      });
    }

    logStep("Cache miss, calling Google API");

    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      input
    )}&key=${googleApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (
      geocodeData.status !== "OK" ||
      !geocodeData.results ||
      geocodeData.results.length === 0
    ) {
      logStep("Google API returned no results", { status: geocodeData.status });
      return createJsonResponse({ lat: null, lng: null });
    }

    const result = geocodeData.results[0];
    const location = result.geometry.location;
    const lat = location.lat;
    const lng = location.lng;
    const formattedAddress = result.formatted_address;

    logStep("Google API success", { lat, lng, formattedAddress });

    // Cache the result (RLS will enforce org access)
    const { error: insertError } = await supabase
      .from("geocoded_locations")
      .upsert(
        {
          organization_id: organizationId,
          input_text: input,
          normalized_text: normalizedInput,
          latitude: lat,
          longitude: lng,
          formatted_address: formattedAddress,
        },
        {
          onConflict: "organization_id,normalized_text",
        }
      );

    if (insertError) {
      logStep("Cache insert error", { error: insertError.message });
      // Don't fail the request - geocoding succeeded, just caching failed
    } else {
      logStep("Cached result");
    }

    return createJsonResponse({
      lat,
      lng,
      formatted_address: formattedAddress,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
