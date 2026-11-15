/**
 * Request preamble helpers shared by authenticated Edge Functions.
 *
 * Every helper returns a ready-made error `Response` (with request-aware CORS
 * headers) on failure, so callers only branch on `instanceof Response`.
 */
import type { z } from "https://esm.sh/zod@4.4.3";
import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createUserSupabaseClient,
  handleCorsPreflightIfNeeded,
  requireUser,
  type AuthError,
  type AuthResult,
} from "./supabase-clients.ts";
import { parseRequestJson } from "./org-scoped-queries.ts";

type CorsPreflightOptions = Parameters<typeof handleCorsPreflightIfNeeded>[1];

/** Create the user-scoped (RLS) client and validate the caller's bearer token. */
export async function authenticateUser(
  req: Request,
): Promise<{ supabase: SupabaseClient; user: User } | Response> {
  const supabase = createUserSupabaseClient(req);
  const auth = await requireUser(req, supabase);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status, { req });
  }
  return { supabase, user: auth.user };
}

/** Answer a CORS preflight, or reject anything other than POST with a 405. */
export function rejectNonPostRequest(
  req: Request,
  corsOptions?: CorsPreflightOptions,
): Response | null {
  const preflight = handleCorsPreflightIfNeeded(req, corsOptions);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }
  return null;
}

/**
 * Authenticate with the supplied strategy, then validate the JSON body.
 * `onAuthenticated` runs between the two steps (for step logging).
 */
export async function authenticateAndParseJson<T>(
  req: Request,
  authenticate: (req: Request) => Promise<AuthResult | AuthError>,
  schema: z.ZodType<T>,
  onAuthenticated?: (user: User) => void,
): Promise<{ user: User; data: T } | Response> {
  const auth = await authenticate(req);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status, { req });
  }
  onAuthenticated?.(auth.user);

  const parsed = await parseRequestJson(req, schema);
  if (!parsed.success) {
    return createErrorResponse(parsed.error, parsed.status, { req });
  }
  return { user: auth.user, data: parsed.data };
}

/** Default authentication strategy: validate the bearer token with a user-scoped client. */
export function requireUserWithUserClient(req: Request): Promise<AuthResult | AuthError> {
  return requireUser(req, createUserSupabaseClient(req));
}

/**
 * Full preamble for authenticated JSON POST handlers: CORS preflight, method
 * check, authentication, then body validation.
 */
export async function prepareAuthenticatedJsonPost<T>(
  req: Request,
  authenticate: (req: Request) => Promise<AuthResult | AuthError>,
  schema: z.ZodType<T>,
  corsOptions?: CorsPreflightOptions,
): Promise<{ user: User; data: T } | Response> {
  const rejected = rejectNonPostRequest(req, corsOptions);
  if (rejected) return rejected;
  return authenticateAndParseJson(req, authenticate, schema);
}

/**
 * POST-only variant of authenticateUser: 405 for any other method, otherwise
 * the user-scoped client and authenticated user. (No CORS preflight handling;
 * callers answer OPTIONS before calling this.)
 */
export async function requireUserPost(
  req: Request,
): Promise<{ supabase: SupabaseClient; user: User } | Response> {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }
  return authenticateUser(req);
}
