/**
 * Public Google Maps Key Edge Function
 *
 * Returns the Google Maps browser API key to authenticated users.
 * Requires a valid JWT (verify_jwt=true in config.toml).
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

    logStep("Successfully returning API key");
    return createJsonResponse({ key: browserKey });
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("[PUBLIC-GOOGLE-MAPS-KEY] Function error:", error);
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
