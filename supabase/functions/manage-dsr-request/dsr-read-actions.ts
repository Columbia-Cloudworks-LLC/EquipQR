/**
 * Read-only DSR actions: list_queue and get_case.
 */

import {
  createErrorResponse,
  createJsonResponse,
  verifyOrgAdmin,
} from "../_shared/supabase-clients.ts";
import { fetchRequest, type AdminClient } from "./dsr-db-helpers.ts";
import { buildSlaBucket, type DsrRequestRow, type ReadAction } from "./dsr-action-types.ts";

export async function handleReadAction(
  admin: AdminClient,
  userId: string,
  organizationId: string,
  action: ReadAction,
  dsrRequestId?: string,
): Promise<Response> {
  const canAdminOrg = await verifyOrgAdmin(admin, userId, organizationId);
  if (!canAdminOrg) {
    return createErrorResponse("Forbidden", 403);
  }

  if (action === "list_queue") {
    const { data, error } = await admin
      .from("dsr_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("received_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[MANAGE-DSR] Queue read failed:", error.message);
      return createErrorResponse("Failed to fetch queue", 500);
    }

    const requests = (data as DsrRequestRow[]).map((request) => ({
      ...request,
      sla_bucket: buildSlaBucket(request),
    }));

    return createJsonResponse({
      success: true,
      action,
      requests,
    });
  }

  if (!dsrRequestId || typeof dsrRequestId !== "string") {
    return createErrorResponse("Missing required field: dsrRequestId", 400);
  }

  const request = await fetchRequest(admin, dsrRequestId, organizationId);
  if (!request) {
    return createErrorResponse("Not found", 404);
  }

  const { data: events, error: eventsError } = await admin
    .from("dsr_request_events")
    .select("*")
    .eq("dsr_request_id", dsrRequestId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (eventsError) {
    console.error("[MANAGE-DSR] Case read failed:", eventsError.message);
    return createErrorResponse("Failed to fetch case details", 500);
  }

  return createJsonResponse({
    success: true,
    action,
    request,
    events: events ?? [],
  });
}
