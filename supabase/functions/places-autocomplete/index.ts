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

import { z } from "https://esm.sh/zod@3.23.8";
import {
  createUserSupabaseClient,
  requireUser,
} from "../_shared/supabase-clients.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Structured logging (no PII) ─────────────────────────────────

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PLACES-AUTOCOMPLETE] ${step}${detailsStr}`);
};

// ── Request validation schemas ──────────────────────────────────

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

// ── Response helpers with validated CORS ─────────────────────────

function createCorsJsonResponse(
  req: Request,
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function createCorsErrorResponse(
  req: Request,
  error: string,
  status = 500,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// ── Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight with validated origin
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    logStep("Function started");

    // Prefer the new canonical name; fall back to legacy names for compat
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_SERVER_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY") || Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      throw new Error("GOOGLE_MAPS_SERVER_KEY is not configured");
    }

    // Authenticate
    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createCorsErrorResponse(req, auth.error, auth.status);
    }
    logStep("User authenticated");

    // Parse and validate request body with Zod
    const rawBody: unknown = await req.json();
    const parseResult = RequestBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i) => i.message)
        .join("; ");
      logStep("Validation failed", { issues });
      return createCorsErrorResponse(
        req,
        "Invalid request body: " + issues,
        400,
      );
    }

    const body = parseResult.data;

    // ── Autocomplete predictions ────────────────────────────
    if (body.action === "autocomplete") {
      const { input, sessionToken } = body;
      if (input.trim().length < 2) {
        return createCorsJsonResponse(req, { predictions: [] });
      }

      const params = new URLSearchParams({
        input: input.trim(),
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      logStep("Calling Google Autocomplete API", { inputLength: input.trim().length });

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        logStep("Google API error", { status: data.status });
        return createCorsJsonResponse(req, { predictions: [], status: data.status });
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
      return createCorsJsonResponse(req, { predictions, status: data.status });
    }

    // ── Place details ───────────────────────────────────────
    if (body.action === "details") {
      const { placeId, sessionToken } = body;

      const params = new URLSearchParams({
        place_id: placeId,
        fields: "address_components,formatted_address,geometry",
        key: googleApiKey,
      });
      if (sessionToken) params.set("sessiontoken", sessionToken);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
      logStep("Calling Google Place Details API");

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" || !data.result) {
        logStep("Google Details API error", { status: data.status });
        return createCorsErrorResponse(req, "Place not found", 404);
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

      logStep("Returning place details");
      return createCorsJsonResponse(req, placeData);
    }

    return createCorsErrorResponse(req, "Invalid action. Use 'autocomplete' or 'details'.", 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return createCorsErrorResponse(req, "An unexpected error occurred", 500);
  }
});
