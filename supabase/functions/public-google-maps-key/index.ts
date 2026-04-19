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
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { MissingSecretError, optionalSecret, requireSecret } from "../_shared/require-secret.ts";

const FUNCTION_NAME = "public-google-maps-key";

const logStep = (
  step: string,
  correlationId: string,
  details?: Record<string, unknown>,
) => {
  console.log(
    JSON.stringify({
      level: "info",
      function: FUNCTION_NAME,
      correlation_id: correlationId,
      step,
      ...details,
    }),
  );
};

Deno.serve(withCorrelationId(async (req, ctx) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function invoked", ctx.correlationId);

    // Create user-scoped client and validate authentication
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    logStep("User authenticated", ctx.correlationId, { userId: auth.user.id });

    const browserKey = requireSecret("GOOGLE_MAPS_BROWSER_KEY", {
      functionName: FUNCTION_NAME,
      legacyAliases: ["VITE_GOOGLE_MAPS_BROWSER_KEY"],
    });

    // Map ID is optional. When absent the client will fall back to a raster
    // map without Advanced Markers and emit a one-time warning. Setting the
    // GOOGLE_MAPS_MAP_ID secret unlocks vector maps and AdvancedMarkerElement.
    const mapId = optionalSecret("GOOGLE_MAPS_MAP_ID");

    logStep("Successfully returning API key", ctx.correlationId, { hasMapId: !!mapId });
    return createJsonResponse({ key: browserKey, mapId });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      // Structured MISSING_REQUIRED_SECRET log already emitted by the
      // helper. createErrorResponse forces the generic client message.
      return createErrorResponse(error, 500);
    }
    console.error(
      JSON.stringify({
        level: "error",
        function: FUNCTION_NAME,
        correlation_id: ctx.correlationId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return createErrorResponse("An unexpected error occurred", 500);
  }
}));
