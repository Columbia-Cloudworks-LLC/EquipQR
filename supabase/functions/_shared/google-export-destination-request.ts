/**
 * Shared auth + body validation for the get/set Google export destination handlers.
 *
 * Authenticates the POST caller with a user-scoped client, validates the JSON body,
 * and requires an organization owner/admin. Failure responses carry CORS headers.
 */

import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.0";
import type { z } from "https://esm.sh/zod@4.4.3";
import {
  createErrorResponse,
  requireAuthenticatedPost,
} from "./supabase-clients.ts";
import { parseRequestJson, requireOrgAdminAccess } from "./org-scoped-queries.ts";

export const EXPORT_DESTINATION_ADMIN_FORBIDDEN_MESSAGE =
  "Forbidden: Only owners and admins can manage export destinations";

export interface ExportDestinationAdminRequest<T> {
  supabase: SupabaseClient;
  user: User;
  data: T;
}

/** Returns an error Response, or the user client, caller, and parsed body once admin access is confirmed. */
export async function authorizeExportDestinationAdminRequest<T extends { organizationId: string }>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<ExportDestinationAdminRequest<T> | Response> {
  const corsOpts = { req };

  const authContext = await requireAuthenticatedPost(req);
  if (authContext instanceof Response) {
    return authContext;
  }
  const { supabase, user } = authContext;

  const parsedBody = await parseRequestJson(req, schema);
  if (!parsedBody.success) {
    return createErrorResponse(parsedBody.error, parsedBody.status, corsOpts);
  }

  const adminAccess = await requireOrgAdminAccess(
    supabase,
    user.id,
    parsedBody.data.organizationId,
    EXPORT_DESTINATION_ADMIN_FORBIDDEN_MESSAGE,
  );
  if ("error" in adminAccess) {
    return createErrorResponse(adminAccess.error, adminAccess.status, corsOpts);
  }

  return { supabase, user, data: parsedBody.data };
}
