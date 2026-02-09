/**
 * Places Autocomplete Edge Function
 *
 * Proxies Google Places Autocomplete API calls server-side so that
 * browser-side referrer restrictions on the Maps JS API key do not
 * block autocomplete predictions.
 *
 * Endpoints (via `action` body param):
 *   - `autocomplete`  → returns place predictions for a text input
 *   - `details`       → returns structured address for a place_id
 *
 * Requires authenticated user (verify_jwt = true).
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
  console.log(`[PLACES-AUTOCOMPLETE] ${step}${detailsStr}`);
};

// ── Types ──────────────────────────────────────────────────────

interface AutocompleteRequest {
  action: "autocomplete";
  input: string;
  sessionToken?: string;
}

interface DetailsRequest {
  action: "details";
  placeId: string;
  sessionToken?: string;
}

type RequestBody = AutocompleteRequest | DetailsRequest;

// ── Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    logStep("Function started");

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY") || Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    // Authenticate
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }
    logStep("User authenticated", { userId: auth.user.id });

    const body: RequestBody = await req.json();

    // ── Autocomplete predictions ────────────────────────────
    if (body.action === "autocomplete") {
      const { input, sessionToken } = body;
      if (!input || typeof input !== "string" || input.trim().length < 2) {
        return createJsonResponse({ predictions: [] });
      }

      const params = new URLSearchParams({
        input: input.trim(),
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      logStep("Calling Google Autocomplete API", { input: input.trim() });

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        logStep("Google API error", { status: data.status, error_message: data.error_message });
        return createJsonResponse({ predictions: [], status: data.status });
      }

      // Return a slim predictions array
      const predictions = (data.predictions ?? []).map(
        (p: Record<string, unknown>) => ({
          place_id: p.place_id,
          description: p.description,
          structured_formatting: p.structured_formatting,
        }),
      );

      logStep("Returning predictions", { count: predictions.length });
      return createJsonResponse({ predictions, status: data.status });
    }

    // ── Place details ───────────────────────────────────────
    if (body.action === "details") {
      const { placeId, sessionToken } = body;
      if (!placeId || typeof placeId !== "string") {
        return createErrorResponse("placeId is required", 400);
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: "address_components,formatted_address,geometry",
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
      logStep("Calling Google Place Details API", { placeId });

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" || !data.result) {
        logStep("Google Details API error", { status: data.status });
        return createErrorResponse("Place not found", 404);
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

      logStep("Returning place details", {
        formatted: placeData.formatted_address.substring(0, 40),
      });
      return createJsonResponse(placeData);
    }

    return createErrorResponse("Invalid action. Use 'autocomplete' or 'details'.", 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
