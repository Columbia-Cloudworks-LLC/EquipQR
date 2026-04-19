/**
 * Places Autocomplete Edge Function
 *
 * Proxies Google Places Autocomplete API calls server-side so that
 * browser-side referrer restrictions on the Maps JS API key do not
 * block autocomplete predictions.
 *
 * Endpoints (via `action` body param):
 *   - `autocomplete`  -> returns place predictions for a text input
 *   - `details`       -> returns structured address for a place_id
 *
 * Requires authenticated user (verify_jwt = true).
 */

import { z } from "https://esm.sh/zod@3.23.8";
import {
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";

const FUNCTION_NAME = "places-autocomplete";

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

// Request validation schemas

const AutocompleteRequestSchema = z.object({
  action: z.literal("autocomplete"),
  input: z.string().min(1).max(500),
  sessionToken: z.string().uuid().optional(),
});

const DetailsRequestSchema = z.object({
  action: z.literal("details"),
  placeId: z.string().min(1).max(300),
  sessionToken: z.string().uuid().optional(),
});

const RequestBodySchema = z.discriminatedUnion("action", [
  AutocompleteRequestSchema,
  DetailsRequestSchema,
]);

// Handler

Deno.serve(withCorrelationId(async (req, ctx) => {
  // CORS preflight with validated origin
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started", ctx.correlationId);

    const googleApiKey = requireSecret("GOOGLE_MAPS_SERVER_KEY", {
      functionName: FUNCTION_NAME,
      legacyAliases: ["GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_API_KEY"],
    });

    // Authenticate
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status, { req });
    }
    logStep("User authenticated", ctx.correlationId);

    // Parse and validate request body with Zod
    const rawBody: unknown = await req.json();
    const parseResult = RequestBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i) => i.message)
        .join("; ");
      logStep("Validation failed", ctx.correlationId, { issues });
      return createErrorResponse(
        "Invalid request body: " + issues,
        400,
        { req },
      );
    }

    const body = parseResult.data;

    // Autocomplete predictions
    if (body.action === "autocomplete") {
      const { input, sessionToken } = body;
      if (input.trim().length < 2) {
        return createJsonResponse({ predictions: [] }, 200, { req });
      }

      const params = new URLSearchParams({
        input: input.trim(),
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      logStep("Calling Google Autocomplete API", ctx.correlationId, { inputLength: input.trim().length });

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        logStep("Google API error", ctx.correlationId, { status: data.status });
        return createJsonResponse({ predictions: [], status: data.status }, 200, { req });
      }

      // Return a slim predictions array
      const predictions = (data.predictions ?? []).map(
        (p: Record<string, unknown>) => ({
          place_id: p.place_id,
          description: p.description,
          structured_formatting: p.structured_formatting,
        }),
      );

      logStep("Returning predictions", ctx.correlationId, { count: predictions.length });
      return createJsonResponse({ predictions, status: data.status }, 200, { req });
    }

    // Place details
    if (body.action === "details") {
      const { placeId, sessionToken } = body;

      const params = new URLSearchParams({
        place_id: placeId,
        fields: "address_components,formatted_address,geometry",
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
      logStep("Calling Google Place Details API", ctx.correlationId);

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" || !data.result) {
        logStep("Google Details API error", ctx.correlationId, { status: data.status });
        return createErrorResponse("Place not found", 404, { req });
      }

      const result = data.result;
      const comps = result.address_components ?? [];
      const get = (type: string) =>
        comps.find((c: Record<string, unknown>) =>
          (c.types as string[])?.includes(type),
        );

      const streetNumber = get("street_number")?.long_name ?? "";
      const route = get("route")?.long_name ?? "";

      const placeData = {
        formatted_address: result.formatted_address ?? "",
        street: [streetNumber, route].filter(Boolean).join(" "),
        city:
          get("locality")?.long_name ??
          get("sublocality")?.long_name ??
          "",
        state: get("administrative_area_level_1")?.short_name ?? "",
        country: get("country")?.long_name ?? "",
        lat: result.geometry?.location?.lat ?? null,
        lng: result.geometry?.location?.lng ?? null,
      };

      logStep("Returning place details", ctx.correlationId);
      return createJsonResponse(placeData, 200, { req });
    }

    return createErrorResponse("Invalid action. Use 'autocomplete' or 'details'.", 400, { req });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      return createErrorResponse(error, 500, { req });
    }
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", ctx.correlationId, { message: msg });
    return createErrorResponse("An unexpected error occurred", 500, { req });
  }
}));
