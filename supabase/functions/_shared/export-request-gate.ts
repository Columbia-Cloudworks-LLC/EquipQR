/**
 * Shared request plumbing for the work-order / report export handlers:
 * authenticated POST wrapper and the admin + rate-limit gate.
 *
 * Handlers keep control of which Supabase client they use; every helper takes the
 * client explicitly (user-scoped for auth/admin checks, per auth-patterns.md).
 */

import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "./cors.ts";
import {
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  requireAuthenticatedPost,
  verifyOrgAdmin,
} from "./supabase-clients.ts";
import {
  checkRateLimit,
  createWorkOrderExportRateLimitResponse,
} from "./work-orders-export-data.ts";

export interface AuthenticatedExportContext {
  req: Request;
  corsHeaders: Record<string, string>;
  /** User-scoped client (RLS applies). */
  supabase: SupabaseClient;
  user: User;
}

/**
 * Handle CORS preflight, require an authenticated POST, then run `handler`.
 * Anything `handler` throws is passed to `onError` to build the response.
 */
export async function handleAuthenticatedExportPost(
  req: Request,
  handler: (ctx: AuthenticatedExportContext) => Promise<Response>,
  onError: (error: unknown) => Response,
): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    return await handler({
      req,
      corsHeaders,
      supabase: authContext.supabase,
      user: authContext.user,
    });
  } catch (error) {
    return onError(error);
  }
}

/** Log `error` under `logLabel` and return the generic 500 used by the export handlers. */
export function unexpectedExportErrorResponse(
  req: Request,
  logLabel: string,
  error: unknown,
): Response {
  console.error(logLabel, error);
  return createErrorResponse("An unexpected error occurred", 500, { req });
}

export interface ExportAdminRateLimitParams {
  req: Request;
  corsHeaders: Record<string, string>;
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
  /**
   * When set, a rate-limit lookup failure is logged under this label and answered with a
   * generic 500. When omitted the error propagates to the caller's catch block.
   */
  rateLimitErrorLabel?: string;
}

/** Require org owner/admin and an available export quota. Returns a Response to send, or null to continue. */
export async function enforceExportAdminAndRateLimit(
  params: ExportAdminRateLimitParams,
): Promise<Response | null> {
  const { req, corsHeaders, supabase, userId, organizationId, rateLimitErrorLabel } = params;

  const isAdmin = await verifyOrgAdmin(supabase, userId, organizationId);
  if (!isAdmin) {
    return createErrorResponse("Forbidden: Only owners and admins can export reports", 403, { req });
  }

  let rateLimitOk: boolean;
  if (rateLimitErrorLabel === undefined) {
    rateLimitOk = await checkRateLimit(supabase, userId, organizationId);
  } else {
    try {
      rateLimitOk = await checkRateLimit(supabase, userId, organizationId);
    } catch (rateLimitError) {
      console.error(rateLimitErrorLabel, rateLimitError);
      return createErrorResponse("An internal error occurred", 500, { req });
    }
  }
  if (!rateLimitOk) {
    return createWorkOrderExportRateLimitResponse(corsHeaders);
  }

  return null;
}
