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
  verifyOrgAdmin,
  verifyOrgMembership,
} from "../_shared/supabase-clients.ts";

type ReadAction = "list_queue" | "get_case";
type MutatingAction =
  | "verify"
  | "deny"
  | "extend"
  | "start_processing"
  | "record_fulfillment_step"
  | "fulfill_deletion"
  | "complete"
  | "add_note"
  | "request_export"
  | "retry_export"
  | "resend_notice";
type Action = ReadAction | MutatingAction;

type DsrRequestRow = {
  id: string;
  status: string;
  request_type: string;
  due_at: string;
  received_at: string;
  updated_at: string;
  organization_id: string | null;
  requester_email: string;
  verification_method: string | null;
  checklist_progress: Record<string, unknown> | null;
  required_checklist_steps: string[] | null;
  export_artifacts: Record<string, unknown> | null;
};

const VALID_ACTIONS: Action[] = [
  "list_queue",
  "get_case",
  "verify",
  "deny",
  "extend",
  "start_processing",
  "record_fulfillment_step",
  "fulfill_deletion",
  "complete",
  "add_note",
  "request_export",
  "retry_export",
  "resend_notice",
];

const VALID_VERIFICATION_METHODS = [
  "authenticated_match",
  "email_challenge",
  "manual_review",
  "authorized_agent",
] as const;

const NOTICE_ACTIONS = ["deny", "extend", "complete"] as const;
const CLOSED_STATUSES = ["completed", "denied"];

function isMutatingAction(action: Action): action is MutatingAction {
  return action !== "list_queue" && action !== "get_case";
}

async function getOrgRole(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  organizationId: string,
): Promise<"owner" | "admin" | "member" | null> {
  const membership = await verifyOrgMembership(admin, userId, organizationId);
  if (!membership.isMember || !membership.role) {
    return null;
  }
  return membership.role as "owner" | "admin" | "member";
}

async function logEvent(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  dsrRequestId: string,
  eventType: string,
  actorId: string,
  actorEmail: string | null | undefined,
  summary: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await admin.from("dsr_request_events").insert({
    dsr_request_id: dsrRequestId,
    event_type: eventType,
    actor_id: actorId,
    actor_email: actorEmail ?? null,
    summary,
    details,
  });

  if (error) {
    console.error("[MANAGE-DSR] Event log failed:", error.message);
  }
}

async function updateWithConcurrency(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  dsrRequestId: string,
  expectedUpdatedAt: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; conflict: boolean; error: string | null }> {
  const nextUpdatedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("dsr_requests")
    .update({
      ...patch,
      updated_at: nextUpdatedAt,
    })
    .eq("id", dsrRequestId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, conflict: false, error: error.message };
  }

  if (!data) {
    return { ok: false, conflict: true, error: null };
  }

  return { ok: true, conflict: false, error: null };
}

async function fetchRequest(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  dsrRequestId: string,
): Promise<DsrRequestRow | null> {
  const { data, error } = await admin
    .from("dsr_requests")
    .select("*")
    .eq("id", dsrRequestId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as DsrRequestRow;
}

function getChecklistProgress(request: DsrRequestRow): Record<string, Record<string, unknown>> {
  if (!request.checklist_progress || typeof request.checklist_progress !== "object") {
    return {};
  }
  return request.checklist_progress as Record<string, Record<string, unknown>>;
}

function areRequiredChecklistStepsComplete(request: DsrRequestRow): boolean {
  const requiredSteps = request.required_checklist_steps ?? [];
  const progress = getChecklistProgress(request);

  return requiredSteps.every((step) => {
    const item = progress[step];
    return !!item && typeof item.completed_at === "string";
  });
}

function buildSlaBucket(request: DsrRequestRow): "overdue" | "due_soon" | "on_track" {
  const dueDate = new Date((request as unknown as { extended_due_at?: string | null }).extended_due_at ?? request.due_at);
  const now = new Date();
  if (dueDate.getTime() < now.getTime()) return "overdue";

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (dueDate.getTime() - now.getTime() <= sevenDaysMs) return "due_soon";

  return "on_track";
}

async function sendLifecycleNotice(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  request: DsrRequestRow,
  userId: string,
  userEmail: string | null | undefined,
  action: "deny" | "extend" | "complete",
  shouldFail: boolean,
) {
  if (shouldFail) {
    await logEvent(
      admin,
      request.id,
      "notice_failed",
      userId,
      userEmail,
      `Notice failed for ${action}`,
      { action, reason: "simulated_provider_failure" },
    );
    return { sent: false };
  }

  await logEvent(
    admin,
    request.id,
    "notice_sent",
    userId,
    userEmail,
    `Notice sent for ${action}`,
    { action },
  );
  return { sent: true };
}

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

    if (!action || !VALID_ACTIONS.includes(action as Action)) {
      return createErrorResponse("Invalid action", 400);
    }
    const typedAction = action as Action;

    if (typedAction === "list_queue" || typedAction === "get_case") {
      if (!organizationId || typeof organizationId !== "string") {
        return createErrorResponse("organizationId is required", 400);
      }

      const canAdminOrg = await verifyOrgAdmin(admin, user.id, organizationId);
      if (!canAdminOrg) {
        return createErrorResponse("Forbidden", 403);
      }

      if (typedAction === "list_queue") {
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
          action: typedAction,
          requests,
        });
      }

      if (!dsrRequestId || typeof dsrRequestId !== "string") {
        return createErrorResponse("Missing required field: dsrRequestId", 400);
      }

      const request = await fetchRequest(admin, dsrRequestId);
      if (!request || request.organization_id !== organizationId) {
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
        action: typedAction,
        request,
        events: events ?? [],
      });
    }

    if (!dsrRequestId || typeof dsrRequestId !== "string") {
      return createErrorResponse("Missing required field: dsrRequestId", 400);
    }
    if (!expected_updated_at || typeof expected_updated_at !== "string") {
      return createErrorResponse("expected_updated_at is required", 400);
    }

    const dsr = await fetchRequest(admin, dsrRequestId);
    if (!dsr || !dsr.organization_id) {
      return createErrorResponse("Not found", 404);
    }

    const role = await getOrgRole(admin, user.id, dsr.organization_id);
    if (!role) {
      return createErrorResponse("Not found", 404);
    }
    if (role !== "owner" && role !== "admin") {
      return createErrorResponse("Forbidden", 403);
    }

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

        const progress = getChecklistProgress(dsr);
        progress.verify_identity = {
          completed_at: new Date().toISOString(),
          actor_id: user.id,
          actor_email: user.email,
          summary: "Identity verification completed",
        };

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          status: "processing",
          verification_method: verificationMethod,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          checklist_progress: progress,
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to verify request", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "checklist_step_completed",
          user.id,
          user.email,
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

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          status: "denied",
          denial_reason: reason.trim(),
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to deny request", 500);

        await sendLifecycleNotice(admin, dsr, user.id, user.email, "deny", Boolean(noticeShouldFail));
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
        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          extension_reason: reason.trim(),
          extended_due_at: maxExtension.toISOString(),
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to extend deadline", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "extension_invoked",
          user.id,
          user.email,
          `Deadline extended to ${maxExtension.toISOString().split("T")[0]}`,
          { reason: reason.trim(), extended_due_at: maxExtension.toISOString() },
        );
        await sendLifecycleNotice(admin, dsr, user.id, user.email, "extend", Boolean(noticeShouldFail));
        break;
      }

      case "start_processing": {
        if (dsr.status !== "verifying" && dsr.status !== "received") {
          return createErrorResponse("Request must be verified before processing", 400);
        }

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          status: "processing",
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to start processing", 500);
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
          actor_id: user.id,
          actor_email: user.email,
          summary: summary.trim(),
        };

        const touch = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          checklist_progress: progress,
        });
        if (touch.conflict) return createErrorResponse("Conflict", 409);
        if (!touch.ok) return createErrorResponse("Failed to record fulfillment step", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "fulfillment_step_completed",
          user.id,
          user.email,
          summary.trim(),
          details || {},
        );
        await logEvent(
          admin,
          dsrRequestId,
          "checklist_step_completed",
          user.id,
          user.email,
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
          { p_dsr_request_id: dsrRequestId, p_admin_user_id: user.id },
        );

        if (fulfillErr) {
          console.error("[MANAGE-DSR] Fulfillment failed:", fulfillErr.message);
          return createErrorResponse("Failed to execute deletion fulfillment", 500);
        }

        const progress = getChecklistProgress(dsr);
        progress.fulfill_request = {
          completed_at: new Date().toISOString(),
          actor_id: user.id,
          actor_email: user.email,
          summary: "Deletion fulfillment executed",
        };

        const complete = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          checklist_progress: progress,
        });
        if (complete.conflict) return createErrorResponse("Conflict", 409);
        if (!complete.ok) return createErrorResponse("Fulfillment succeeded but completion update failed", 500);

        const finalState = await fetchRequest(admin, dsrRequestId);
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
        if (!areRequiredChecklistStepsComplete(dsr)) {
          return createErrorResponse("Required checklist steps are incomplete", 400);
        }

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to complete request", 500);

        await sendLifecycleNotice(admin, dsr, user.id, user.email, "complete", Boolean(noticeShouldFail));
        break;
      }

      case "add_note": {
        if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
          return createErrorResponse("Note text is required", 400);
        }

        const touch = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {});
        if (touch.conflict) return createErrorResponse("Conflict", 409);
        if (!touch.ok) return createErrorResponse("Failed to add note", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "note_added",
          user.id,
          user.email,
          summary.trim(),
          details || {},
        );
        break;
      }

      case "request_export": {
        const previous = (dsr.export_artifacts ?? {}) as Record<string, unknown>;
        const previousVersion = typeof previous.version === "number" ? previous.version : 0;
        const version = previousVersion + 1;
        const nowIso = new Date().toISOString();
        const simulateFailure = Boolean(details?.simulateFailure);
        const keepPending = Boolean(details?.keepPending);
        const retryCount = typeof previous.retry_count === "number" ? previous.retry_count : 0;

        const metadata: Record<string, unknown> = {
          version,
          requested_by: user.id,
          requested_at: nowIso,
          generated_at: keepPending || simulateFailure ? null : nowIso,
          checksum_sha256: keepPending || simulateFailure ? null : crypto.randomUUID().replaceAll("-", ""),
          status: keepPending ? "pending" : (simulateFailure ? "failed" : "ready"),
          retry_count: simulateFailure ? retryCount + 1 : retryCount,
          last_error: simulateFailure ? "Export generation failed" : null,
        };

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          export_artifacts: metadata,
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to request export", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "export_requested",
          user.id,
          user.email,
          `Export requested (v${version})`,
          { version },
        );

        await logEvent(
          admin,
          dsrRequestId,
          simulateFailure ? "export_failed" : (keepPending ? "export_requested" : "export_ready"),
          user.id,
          user.email,
          simulateFailure ? `Export failed (v${version})` : `Export ${keepPending ? "pending" : "ready"} (v${version})`,
          { version },
        );
        break;
      }

      case "retry_export": {
        const current = (dsr.export_artifacts ?? {}) as Record<string, unknown>;
        const retryCount = typeof current.retry_count === "number" ? current.retry_count : 0;
        if (retryCount >= 3) {
          return createErrorResponse("Export retry limit reached", 400);
        }

        const version = typeof current.version === "number" ? current.version : 1;
        const nowIso = new Date().toISOString();
        const metadata: Record<string, unknown> = {
          ...current,
          version,
          status: "ready",
          generated_at: nowIso,
          checksum_sha256: crypto.randomUUID().replaceAll("-", ""),
          retry_count: retryCount + 1,
          last_error: null,
        };

        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {
          export_artifacts: metadata,
        });
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to retry export", 500);

        await logEvent(
          admin,
          dsrRequestId,
          "export_ready",
          user.id,
          user.email,
          `Export ready after retry (v${version})`,
          { version, retry_count: retryCount + 1 },
        );
        break;
      }

      case "resend_notice": {
        const noticeAction = ((details?.action as string) ?? "complete") as "deny" | "extend" | "complete";
        if (!NOTICE_ACTIONS.includes(noticeAction)) {
          return createErrorResponse("Invalid notice action", 400);
        }
        const result = await updateWithConcurrency(admin, dsrRequestId, expected_updated_at, {});
        if (result.conflict) return createErrorResponse("Conflict", 409);
        if (!result.ok) return createErrorResponse("Failed to resend notice", 500);

        await sendLifecycleNotice(admin, dsr, user.id, user.email, noticeAction, Boolean(noticeShouldFail));
        break;
      }
    }

    const updated = await fetchRequest(admin, dsrRequestId);
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

export const __testables = {
  isMutatingAction,
  areRequiredChecklistStepsComplete,
  buildSlaBucket,
};

if (import.meta.main) {
  Deno.serve(handleManageDsrRequest);
}
