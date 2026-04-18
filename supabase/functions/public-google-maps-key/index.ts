/**
 * Public Google Maps Key Edge Function
 *
 * Returns the Google Maps browser API key (and the optional Map ID used for
 * vector maps + Advanced Markers) to authenticated users.
 * Requires a valid JWT (verify_jwt=true in config.toml).
 *
 * Response shape:
 *   { key: string, mapId: string | null }
 *
 * The Map ID is per-environment (Preview vs Production) and supplied via the
 * GOOGLE_MAPS_MAP_ID Supabase secret. It is non-secret (visible in client
 * network traffic) but co-located with the API key for operational simplicity
 * — one place to rotate, one place to inspect.
 */

import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PUBLIC-GOOGLE-MAPS-KEY] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function invoked");

    // Create user-scoped client and validate authentication
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    logStep("User authenticated", { userId: auth.user.id });

    // Prefer the new name; fall back to legacy VITE_-prefixed name for compat
    const browserKey = Deno.env.get("GOOGLE_MAPS_BROWSER_KEY") || Deno.env.get("VITE_GOOGLE_MAPS_BROWSER_KEY");

    if (!browserKey) {
      logStep("Missing API key in environment");
      return createErrorResponse("An internal error occurred", 500);
    }

    // Map ID is optional. When absent the client will fall back to a raster
    // map without Advanced Markers and emit a one-time warning. Setting the
    // GOOGLE_MAPS_MAP_ID secret unlocks vector maps and AdvancedMarkerElement.
    const mapId = Deno.env.get("GOOGLE_MAPS_MAP_ID") || null;

    logStep("Successfully returning API key", { hasMapId: !!mapId });
    return createJsonResponse({ key: browserKey, mapId });
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("[PUBLIC-GOOGLE-MAPS-KEY] Function error:", error);
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
