/**
 * Manage DSR Request Edge Function
 *
 * Internal admin-only endpoint for managing Data Subject Request lifecycle:
 *   - Verify identity (move received → processing)
 *   - Deny request with lawful basis
 *   - Invoke deadline extension
 *   - Record fulfillment steps
 *   - Complete request
 *   - Add notes/artifacts to the event ledger
 *
 * Requires authenticated admin/owner of any organization.
 */

import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

type Action =
  | "verify"
  | "deny"
  | "extend"
  | "start_processing"
  | "record_fulfillment_step"
  | "fulfill_deletion"
  | "complete"
  | "add_note";

const VALID_ACTIONS: Action[] = [
  "verify",
  "deny",
  "extend",
  "start_processing",
  "record_fulfillment_step",
  "fulfill_deletion",
  "complete",
  "add_note",
];

const VALID_VERIFICATION_METHODS = [
  "authenticated_match",
  "email_challenge",
  "manual_review",
  "authorized_agent",
] as const;

async function isUserAdmin(
  adminClient: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await adminClient
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  return !!data;
}

Deno.serve(async (req) => {
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

  const adminCheck = await isUserAdmin(admin, user.id);
  if (!adminCheck) {
    return createErrorResponse("Forbidden", 403);
  }

  try {
    const body = await req.json();
    const { dsrRequestId, action, reason, verificationMethod, summary, details } = body as {
      dsrRequestId?: string;
      action?: string;
      reason?: string;
      verificationMethod?: string;
      summary?: string;
      details?: Record<string, unknown>;
    };

    if (!dsrRequestId || typeof dsrRequestId !== "string") {
      return createErrorResponse("Missing required field: dsrRequestId", 400);
    }
    if (!action || !VALID_ACTIONS.includes(action as Action)) {
      return createErrorResponse("Invalid action", 400);
    }

    const { data: dsr, error: fetchErr } = await admin
      .from("dsr_requests")
      .select("*")
      .eq("id", dsrRequestId)
      .single();

    if (fetchErr || !dsr) {
      return createErrorResponse("Not found", 404);
    }

    const typedAction = action as Action;

    switch (typedAction) {
      case "verify": {
        if (dsr.status !== "received" && dsr.status !== "verifying") {
          return createErrorResponse("Request is not in a verifiable state", 400);
        }
        if (!verificationMethod || !VALID_VERIFICATION_METHODS.includes(
          verificationMethod as typeof VALID_VERIFICATION_METHODS[number],
        )) {
          return createErrorResponse("Invalid verification method", 400);
        }

        const { error } = await admin
          .from("dsr_requests")
          .update({
            status: "processing",
            verification_method: verificationMethod,
            verified_at: new Date().toISOString(),
            verified_by: user.id,
          })
          .eq("id", dsrRequestId);

        if (error) {
          console.error("[MANAGE-DSR] Verify failed:", error.message);
          return createErrorResponse("Failed to verify request", 500);
        }
        break;
      }

      case "deny": {
        if (dsr.status === "completed" || dsr.status === "denied") {
          return createErrorResponse("Request is already closed", 400);
        }
        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
          return createErrorResponse("Denial reason is required", 400);
        }

        const { error } = await admin
          .from("dsr_requests")
          .update({
            status: "denied",
            denial_reason: reason.trim(),
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", dsrRequestId);

        if (error) {
          console.error("[MANAGE-DSR] Deny failed:", error.message);
          return createErrorResponse("Failed to deny request", 500);
        }
        break;
      }

      case "extend": {
        if (dsr.status === "completed" || dsr.status === "denied") {
          return createErrorResponse("Request is already closed", 400);
        }
        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
          return createErrorResponse("Extension reason is required", 400);
        }

        const receivedAt = new Date(dsr.received_at);
        const maxExtension = new Date(receivedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

        const { error } = await admin
          .from("dsr_requests")
          .update({
            extension_reason: reason.trim(),
            extended_due_at: maxExtension.toISOString(),
          })
          .eq("id", dsrRequestId);

        if (error) {
          console.error("[MANAGE-DSR] Extend failed:", error.message);
          return createErrorResponse("Failed to extend deadline", 500);
        }

        await admin.from("dsr_request_events").insert({
          dsr_request_id: dsrRequestId,
          event_type: "extension_invoked",
          actor_id: user.id,
          actor_email: user.email,
          summary: "Deadline extended to " + maxExtension.toISOString().split("T")[0],
          details: { reason: reason.trim(), extended_due_at: maxExtension.toISOString() },
        });
        break;
      }

      case "start_processing": {
        if (dsr.status !== "verifying" && dsr.status !== "received") {
          return createErrorResponse("Request must be verified before processing", 400);
        }

        const { error } = await admin
          .from("dsr_requests")
          .update({ status: "processing" })
          .eq("id", dsrRequestId);

        if (error) {
          console.error("[MANAGE-DSR] Start processing failed:", error.message);
          return createErrorResponse("Failed to start processing", 500);
        }
        break;
      }

      case "record_fulfillment_step": {
        if (dsr.status !== "processing") {
          return createErrorResponse("Request must be in processing state", 400);
        }
        if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
          return createErrorResponse("Fulfillment step summary is required", 400);
        }

        const { error } = await admin.from("dsr_request_events").insert({
          dsr_request_id: dsrRequestId,
          event_type: "fulfillment_step_completed",
          actor_id: user.id,
          actor_email: user.email,
          summary: summary.trim(),
          details: details || {},
        });

        if (error) {
          console.error("[MANAGE-DSR] Record step failed:", error.message);
          return createErrorResponse("Failed to record fulfillment step", 500);
        }
        break;
      }

      case "fulfill_deletion": {
        if (dsr.status !== "processing") {
          return createErrorResponse("Request must be in processing state", 400);
        }
        if (dsr.request_type !== "deletion") {
          return createErrorResponse("Fulfillment engine only handles deletion requests", 400);
        }

        const { data: fulfillmentResult, error: fulfillErr } = await admin.rpc(
          "fulfill_dsr_deletion",
          { p_dsr_request_id: dsrRequestId, p_admin_user_id: user.id },
        );

        if (fulfillErr) {
          console.error("[MANAGE-DSR] Fulfillment failed:", fulfillErr.message);
          return createErrorResponse("Failed to execute deletion fulfillment", 500);
        }

        const { error: completeErr } = await admin
          .from("dsr_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", dsrRequestId);

        if (completeErr) {
          console.error("[MANAGE-DSR] Post-fulfillment complete failed:", completeErr.message);
          return createErrorResponse("Fulfillment succeeded but completion update failed", 500);
        }

        const { data: finalState } = await admin
          .from("dsr_requests")
          .select("*")
          .eq("id", dsrRequestId)
          .single();

        return createJsonResponse({
          success: true,
          action: typedAction,
          fulfillment: fulfillmentResult,
          request: finalState,
        });
      }

      case "complete": {
        if (dsr.status !== "processing") {
          return createErrorResponse("Request must be in processing state to complete", 400);
        }

        const { error } = await admin
          .from("dsr_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", dsrRequestId);

        if (error) {
          console.error("[MANAGE-DSR] Complete failed:", error.message);
          return createErrorResponse("Failed to complete request", 500);
        }
        break;
      }

      case "add_note": {
        if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
          return createErrorResponse("Note text is required", 400);
        }

        const { error } = await admin.from("dsr_request_events").insert({
          dsr_request_id: dsrRequestId,
          event_type: "note_added",
          actor_id: user.id,
          actor_email: user.email,
          summary: summary.trim(),
          details: details || {},
        });

        if (error) {
          console.error("[MANAGE-DSR] Add note failed:", error.message);
          return createErrorResponse("Failed to add note", 500);
        }
        break;
      }
    }

    const { data: updated } = await admin
      .from("dsr_requests")
      .select("*")
      .eq("id", dsrRequestId)
      .single();

    return createJsonResponse({
      success: true,
      action: typedAction,
      request: updated,
    });
  } catch (err) {
    console.error("[MANAGE-DSR] Unexpected error:", err);
    return createErrorResponse("Failed to manage privacy request", 500);
  }
});
