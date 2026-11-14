/**
 * POST-only, user-scoped authentication for handlers that attach CORS headers
 * (via `{ req }`) to their auth failure responses.
 *
 * Follows docs/edge-functions/auth-patterns.md: `createUserSupabaseClient(req)` + `requireUser`.
 */

import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createUserSupabaseClient,
  requireUser,
} from "./supabase-clients.ts";

export interface UserPostContext {
  supabase: SupabaseClient;
  user: User;
}

/** Returns a 405/401-style Response, or the user-scoped client and authenticated user. */
export async function requireUserPost(req: Request): Promise<UserPostContext | Response> {
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  const supabase = createUserSupabaseClient(req);
  const auth = await requireUser(req, supabase);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status, { req });
  }

  return { supabase, user: auth.user };
}
