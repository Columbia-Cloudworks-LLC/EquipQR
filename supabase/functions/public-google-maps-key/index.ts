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
 *
 * Ordering contract (intentional, depended on by the smoke test):
 *   1. CORS preflight
 *   2. Load required secret (GOOGLE_MAPS_BROWSER_KEY) — fails 500 if missing
 *   3. Load optional secret (GOOGLE_MAPS_MAP_ID)
 *   4. Authenticate the caller (requireUser) — fails 401 if no user JWT
 *   5. Return the key
 *
 * Steps 2-3 deliberately precede step 4 so that any caller (even an anon-key
 * call from .github/workflows/edge-functions-smoke-test.yml) hits a 500 when
 * the required secret is absent. Without this ordering, the smoke test could
 * not distinguish "function deployed but missing secret" from "function
 * deployed correctly" — both would return 401 to an anon caller. There is no
 * info leak: createErrorResponse forces a generic client message and the
 * structured MISSING_REQUIRED_SECRET log line is operator-only. The
 * existence of a misconfiguration is itself a non-secret operational signal.
 */

import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
  type RequestContext,
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

/**
 * Inner request handler. Exported via `__testables` so the Deno test can
 * assert the secret-before-auth ordering contract without spinning up an
 * HTTP server. Production traffic enters via `Deno.serve(withCorrelationId(handle))`
 * at the bottom of this file.
 */
async function handle(req: Request, ctx: RequestContext): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function invoked", ctx.correlationId);

    // Step 2: Load required secret BEFORE auth so missing-secret deploys
    // surface 500s to anon callers (operator visibility via the smoke test).
    // See ordering contract in the file header.
    const browserKey = requireSecret("GOOGLE_MAPS_BROWSER_KEY", {
      functionName: FUNCTION_NAME,
      legacyAliases: ["VITE_GOOGLE_MAPS_BROWSER_KEY"],
    });

    // Step 3: Load optional secret. When absent the client falls back to a
    // raster map without Advanced Markers and emits a one-time warning.
    // Setting GOOGLE_MAPS_MAP_ID unlocks vector maps and AdvancedMarkerElement.
    const mapId = optionalSecret("GOOGLE_MAPS_MAP_ID");

    // Step 4: Authenticate the caller. Anon-key probes (e.g. the
    // edge-functions-smoke-test workflow) reach this point and return 401
    // here, which after step 2 succeeds is a true positive signal that the
    // function is deployed AND its secrets are loaded.
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    logStep("User authenticated", ctx.correlationId, { userId: auth.user.id });
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
}

export const __testables = { handle };

Deno.serve(withCorrelationId(handle));
