/**
 * Mutating DSR actions (excluding read-only queue/case reads).
 */

import { createErrorResponse, createJsonResponse } from "../_shared/supabase-clients.ts";
import {
  areRequiredChecklistStepsComplete,
  CLOSED_STATUSES,
  getChecklistProgress,
  NOTICE_ACTIONS,
  VALID_VERIFICATION_METHODS,
  type DsrRequestRow,
  type MutatingAction,
} from "./dsr-action-types.ts";
import type { AdminClient } from "./dsr-db-helpers.ts";
import {
  fetchRequest,
  logEvent,
  sendLifecycleNotice,
  updateWithConcurrency,
} from "./dsr-db-helpers.ts";
import { handleRequestExport, handleRetryExport } from "./dsr-export-artifacts.ts";

export interface MutatingActionContext {
  admin: AdminClient;
  dsr: DsrRequestRow;
  dsrRequestId: string;
  organizationId: string;
  expectedUpdatedAt: string;
  userId: string;
  userEmail: string | null | undefined;
  reason?: string;
  verificationMethod?: string;
  summary?: string;
  details?: Record<string, unknown>;
  noticeShouldFail?: boolean;
}

export async function handleMutatingAction(
  action: MutatingAction,
  ctx: MutatingActionContext,
): Promise<Response | null> {
  const {
    admin,
    dsr,
    dsrRequestId,
    organizationId,
    expectedUpdatedAt,
    userId,
    userEmail,
    reason,
    verificationMethod,
    summary,
    details,
    noticeShouldFail,
  } = ctx;

  switch (action) {
    case "verify": {
      if (dsr.status !== "received" && dsr.status !== "verifying") {
        return createErrorResponse("Request is not in a verifiable state", 400);
      }
      if (!verificationMethod || !VALID_VERIFICATION_METHODS.includes(
        verificationMethod as typeof VALID_VERIFICATION_METHODS[number],
      )) {
        return createErrorResponse("Invalid verification method", 400);
      }

      const progress = getChecklistProgress(dsr);
      progress.verify_identity = {
        completed_at: new Date().toISOString(),
        actor_id: userId,
        actor_email: userEmail,
        summary: "Identity verification completed",
      };

      const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        status: "processing",
        verification_method: verificationMethod,
        verified_at: new Date().toISOString(),
        verified_by: userId,
        checklist_progress: progress,
      });
      if (result.conflict) return createErrorResponse("Conflict", 409);
      if (!result.ok) return createErrorResponse("Failed to verify request", 500);

      await logEvent(
        admin,
        dsrRequestId,
        "checklist_step_completed",
        userId,
        userEmail,
        "Checklist step complete: verify_identity",
        { step: "verify_identity" },
      );
      break;
    }

    case "deny": {
      if (CLOSED_STATUSES.includes(dsr.status)) {
        return createErrorResponse("Request is already closed", 400);
      }
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return createErrorResponse("Denial reason is required", 400);
      }

      const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        status: "denied",
        denial_reason: reason.trim(),
        completed_at: new Date().toISOString(),
        completed_by: userId,
      });
      if (result.conflict) return createErrorResponse("Conflict", 409);
      if (!result.ok) return createErrorResponse("Failed to deny request", 500);

      await sendLifecycleNotice(admin, dsr, userId, userEmail, "deny", Boolean(noticeShouldFail));
      break;
    }

    case "extend": {
      if (CLOSED_STATUSES.includes(dsr.status)) {
        return createErrorResponse("Request is already closed", 400);
      }
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return createErrorResponse("Extension reason is required", 400);
      }

      const receivedAt = new Date(dsr.received_at);
      const maxExtension = new Date(receivedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
      const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        extension_reason: reason.trim(),
        extended_due_at: maxExtension.toISOString(),
      });
      if (result.conflict) return createErrorResponse("Conflict", 409);
      if (!result.ok) return createErrorResponse("Failed to extend deadline", 500);

      await logEvent(
        admin,
        dsrRequestId,
        "extension_invoked",
        userId,
        userEmail,
        `Deadline extended to ${maxExtension.toISOString().split("T")[0]}`,
        { reason: reason.trim(), extended_due_at: maxExtension.toISOString() },
      );
      await sendLifecycleNotice(admin, dsr, userId, userEmail, "extend", Boolean(noticeShouldFail));
      break;
    }

    case "record_fulfillment_step": {
      if (dsr.status !== "processing") {
        return createErrorResponse("Request must be in processing state", 400);
      }
      if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
        return createErrorResponse("Fulfillment step summary is required", 400);
      }

      const step = typeof details?.step === "string" ? details.step : "fulfill_request";
      const progress = getChecklistProgress(dsr);
      progress[step] = {
        completed_at: new Date().toISOString(),
        actor_id: userId,
        actor_email: userEmail,
        summary: summary.trim(),
      };

      const touch = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        checklist_progress: progress,
      });
      if (touch.conflict) return createErrorResponse("Conflict", 409);
      if (!touch.ok) return createErrorResponse("Failed to record fulfillment step", 500);

      await logEvent(
        admin,
        dsrRequestId,
        "fulfillment_step_completed",
        userId,
        userEmail,
        summary.trim(),
        details || {},
      );
      await logEvent(
        admin,
        dsrRequestId,
        "checklist_step_completed",
        userId,
        userEmail,
        `Checklist step complete: ${step}`,
        { step, ...(details || {}) },
      );
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
        { p_dsr_request_id: dsrRequestId, p_admin_user_id: userId },
      );

      if (fulfillErr) {
        console.error("[MANAGE-DSR] Fulfillment failed:", fulfillErr.message);
        return createErrorResponse("Failed to execute deletion fulfillment", 500);
      }

      const progress = getChecklistProgress(dsr);
      progress.fulfill_request = {
        completed_at: new Date().toISOString(),
        actor_id: userId,
        actor_email: userEmail,
        summary: "Deletion fulfillment executed",
      };

      const complete = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: userId,
        checklist_progress: progress,
      });
      if (complete.conflict) return createErrorResponse("Conflict", 409);
      if (!complete.ok) return createErrorResponse("Fulfillment succeeded but completion update failed", 500);

      const finalState = await fetchRequest(admin, dsrRequestId, organizationId);
      return createJsonResponse({
        success: true,
        action,
        fulfillment: fulfillmentResult,
        request: finalState,
      });
    }

    case "complete": {
      if (dsr.status !== "processing") {
        return createErrorResponse("Request must be in processing state to complete", 400);
      }
      if (!areRequiredChecklistStepsComplete(dsr)) {
        return createErrorResponse("Required checklist steps are incomplete", 400);
      }

      const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: userId,
      });
      if (result.conflict) return createErrorResponse("Conflict", 409);
      if (!result.ok) return createErrorResponse("Failed to complete request", 500);

      await sendLifecycleNotice(admin, dsr, userId, userEmail, "complete", Boolean(noticeShouldFail));
      break;
    }

    case "add_note": {
      if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
        return createErrorResponse("Note text is required", 400);
      }

      const touch = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {});
      if (touch.conflict) return createErrorResponse("Conflict", 409);
      if (!touch.ok) return createErrorResponse("Failed to add note", 500);

      await logEvent(
        admin,
        dsrRequestId,
        "note_added",
        userId,
        userEmail,
        summary.trim(),
        details || {},
      );
      break;
    }

    case "request_export":
      return handleRequestExport(
        admin,
        dsr,
        dsrRequestId,
        organizationId,
        expectedUpdatedAt,
        userId,
        userEmail,
        details,
      );

    case "retry_export":
      return handleRetryExport(
        admin,
        dsr,
        dsrRequestId,
        organizationId,
        expectedUpdatedAt,
        userId,
        userEmail,
      );

    case "resend_notice": {
      const noticeAction = ((details?.action as string) ?? "complete") as "deny" | "extend" | "complete";
      if (!NOTICE_ACTIONS.includes(noticeAction)) {
        return createErrorResponse("Invalid notice action", 400);
      }
      const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {});
      if (result.conflict) return createErrorResponse("Conflict", 409);
      if (!result.ok) return createErrorResponse("Failed to resend notice", 500);

      await sendLifecycleNotice(admin, dsr, userId, userEmail, noticeAction, Boolean(noticeShouldFail));
      break;
    }
  }

  return null;
}
