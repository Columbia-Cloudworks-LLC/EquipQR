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
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  applyOrganizationScope,
  geocodeLocationRequestSchema,
  parseJsonBody,
  requireOrgMembership,
} from "../_shared/org-scoped-queries.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";

const FUNCTION_NAME = "geocode-location";

const logStep = createStructuredLogger(FUNCTION_NAME);

// Normalize address text (must match client-side logic)
function normalizeAddress(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started", ctx.correlationId);

    const googleApiKey = requireSecret("GOOGLE_MAPS_SERVER_KEY", {
      functionName: FUNCTION_NAME,
      legacyAliases: ["GOOGLE_MAPS_API_KEY"],
    });

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;
    logStep("User authenticated", ctx.correlationId, { userId: user.id });

    const parsedBody = parseJsonBody(geocodeLocationRequestSchema, await req.json());
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status);
    }
    const { organizationId, input } = parsedBody.data;

    const orgAccess = await requireOrgMembership(supabase, user.id, organizationId);
    if ("error" in orgAccess) {
      logStep("Org membership denied", ctx.correlationId, { userId: user.id, orgId: organizationId });
      return createErrorResponse(orgAccess.error, orgAccess.status);
    }

    const normalizedInput = normalizeAddress(input);
    if (!normalizedInput) {
      return createJsonResponse({ lat: null, lng: null });
    }

    // Rate limiting: max 30 geocode cache misses per organization per minute.
    // We count recent inserts into geocoded_locations (which only happen on
    // cache misses that call the Google API). Cache hits are free.
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount, error: rateLimitError } = await applyOrganizationScope(
      supabase
        .from("geocoded_locations")
        .select("id", { count: "exact", head: true }),
      organizationId,
    )
      .gte("created_at", oneMinuteAgo);

    if (!rateLimitError && (recentCount ?? 0) >= 30) {
      logStep("Rate limit exceeded", ctx.correlationId, { userId: user.id, recentCount });
      return createErrorResponse("Rate limit exceeded", 429);
    }

    logStep("Checking cache", ctx.correlationId, { organizationId, normalizedInput });

    // Check cache first (RLS will restrict to user's orgs)
    const { data: cached, error: cacheError } = await applyOrganizationScope(
      supabase
        .from("geocoded_locations")
        .select("latitude, longitude, formatted_address"),
      organizationId,
    )
      .eq("normalized_text", normalizedInput)
      .maybeSingle();

    if (cacheError) {
      logStep("Cache check error", ctx.correlationId, { error: cacheError.message });
    } else if (cached) {
      logStep("Cache hit", ctx.correlationId);
      return createJsonResponse({
        lat: cached.latitude,
        lng: cached.longitude,
        formatted_address: cached.formatted_address,
      });
    }

    logStep("Cache miss, calling Google API", ctx.correlationId);

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
      logStep("Google API returned no results", ctx.correlationId, { status: geocodeData.status });
      return createJsonResponse({ lat: null, lng: null });
    }

    const result = geocodeData.results[0];
    const location = result.geometry.location;
    const lat = location.lat;
    const lng = location.lng;
    const formattedAddress = result.formatted_address;

    logStep("Google API success", ctx.correlationId, { lat, lng, formattedAddress });

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
      logStep("Cache insert error", ctx.correlationId, { error: insertError.message });
      // Don't fail the request - geocoding succeeded, just caching failed
    } else {
      logStep("Cached result", ctx.correlationId);
    }

    return createJsonResponse({
      lat,
      lng,
      formatted_address: formattedAddress,
    });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      return createErrorResponse(error, 500);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", ctx.correlationId, { message: errorMessage });
    return createErrorResponse("An unexpected error occurred", 500);
  }
}));
