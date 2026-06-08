/**
 * Manage DSR Request Edge Function
 *
 * Org-scoped admin endpoint for DSR lifecycle, queue reads, checklist progression,
 * notice attempts, and evidence export state handling.
 */

import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import {
  areRequiredChecklistStepsComplete,
  buildSlaBucket,
  isMutatingAction,
  isValidAction,
  type Action,
} from "./dsr-action-types.ts";
import { handleReadAction } from "./dsr-read-actions.ts";
import { handleMutatingAction } from "./dsr-mutating-actions.ts";
import { fetchRequest, getOrgRole } from "./dsr-db-helpers.ts";

export const __testables = {
  isMutatingAction,
  isValidAction,
  areRequiredChecklistStepsComplete,
  buildSlaBucket,
};

export async function handleManageDsrRequest(req: Request): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  const userClient = createUserSupabaseClient(req);
  const auth = await requireUser(req, userClient);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status);
  }

  const { user } = auth;
  const admin = createAdminSupabaseClient();

  try {
    const body = await req.json();
    const {
      dsrRequestId,
      organizationId,
      action,
      reason,
      verificationMethod,
      summary,
      details,
      expected_updated_at,
      noticeShouldFail,
    } = body as {
      dsrRequestId?: string;
      organizationId?: string;
      action?: string;
      reason?: string;
      verificationMethod?: string;
      summary?: string;
      details?: Record<string, unknown>;
      expected_updated_at?: string;
      noticeShouldFail?: boolean;
    };

    if (!action || !isValidAction(action)) {
      return createErrorResponse("Invalid action", 400);
    }
    const typedAction = action as Action;

    if (typedAction === "list_queue" || typedAction === "get_case") {
      if (!organizationId || typeof organizationId !== "string") {
        return createErrorResponse("organizationId is required", 400);
      }

      return handleReadAction(admin, user.id, organizationId, typedAction, dsrRequestId);
    }

    if (!dsrRequestId || typeof dsrRequestId !== "string") {
      return createErrorResponse("Missing required field: dsrRequestId", 400);
    }
    if (!organizationId || typeof organizationId !== "string") {
      return createErrorResponse("organizationId is required", 400);
    }
    if (!expected_updated_at || typeof expected_updated_at !== "string") {
      return createErrorResponse("expected_updated_at is required", 400);
    }

    const dsr = await fetchRequest(admin, dsrRequestId, organizationId);
    if (!dsr || !dsr.organization_id) {
      return createErrorResponse("Not found", 404);
    }

    const role = await getOrgRole(admin, user.id, organizationId);
    if (!role) {
      return createErrorResponse("Not found", 404);
    }
    if (role !== "owner" && role !== "admin") {
      return createErrorResponse("Forbidden", 403);
    }

    const earlyResponse = await handleMutatingAction(typedAction, {
      admin,
      dsr,
      dsrRequestId,
      organizationId,
      expectedUpdatedAt: expected_updated_at,
      userId: user.id,
      userEmail: user.email,
      reason,
      verificationMethod,
      summary,
      details,
      noticeShouldFail,
    });

    if (earlyResponse) {
      return earlyResponse;
    }

    const updated = await fetchRequest(admin, dsrRequestId, organizationId);
    return createJsonResponse({
      success: true,
      action: typedAction,
      request: updated,
    });
  } catch (err) {
    console.error("[MANAGE-DSR] Unexpected error:", err);
    return createErrorResponse("Failed to manage privacy request", 500);
  }
}

if (import.meta.main) {
  Deno.serve(handleManageDsrRequest);
}
