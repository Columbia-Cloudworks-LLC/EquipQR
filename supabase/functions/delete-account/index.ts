/**
 * Delete Account Edge Function
 *
 * Hybrid self-service account deletion:
 * - Dry-run preview via preview_account_deletion
 * - Blocked path creates/updates a DSR deletion case
 * - Eligible path runs prepare_account_deletion, storage cleanup, Auth delete
 */

import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";

const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";
const STORAGE_REMOVE_CHUNK_SIZE = 1000;

type DeleteAccountRequest = {
  confirmationText?: string;
  expectedUserEmail?: string;
  dryRunOnly?: boolean;
};

type Blocker = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type PreviewResult = {
  eligible_for_self_service: boolean;
  blockers: Blocker[];
  personal_data: Record<string, unknown>;
  organization_data: Record<string, unknown>;
  storage_actions: Record<string, unknown>[];
  auth_fk_blockers: Record<string, unknown>[];
  warnings: Record<string, unknown>[];
  requester_email?: string | null;
  requester_name?: string | null;
};

type StorageDeletePath = {
  bucket: string;
  path: string;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

async function upsertDeletionDsrCase(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  preview: PreviewResult,
  status: "received" | "verifying",
): Promise<string | null> {
  const requesterEmail = normalizeEmail(preview.requester_email);
  const requesterName = preview.requester_name?.trim() || "Account Holder";

  const { data: existing } = await admin
    .from("dsr_requests")
    .select("id, status")
    .eq("user_id", userId)
    .eq("request_type", "deletion")
    .not("status", "in", "(completed,denied)")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("dsr_requests")
      .update({
        status,
        verification_method: status === "verifying" ? "authenticated_match" : null,
        requester_email: requesterEmail,
        requester_name: requesterName,
      })
      .eq("id", existing.id);

    await admin.from("dsr_request_events").insert({
      dsr_request_id: existing.id,
      event_type: "note_added",
      actor_id: userId,
      actor_email: requesterEmail,
      summary: "Account deletion request updated from Settings",
      details: { blockers: preview.blockers, source: "delete-account" },
    });

    return existing.id;
  }

  const { data, error } = await admin
    .from("dsr_requests")
    .insert({
      user_id: userId,
      requester_email: requesterEmail,
      requester_name: requesterName,
      request_type: "deletion",
      status,
      verification_method: status === "verifying" ? "authenticated_match" : null,
      details: "Self-service account deletion request from Settings",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DELETE-ACCOUNT] DSR insert failed:", error.message);
    return null;
  }

  await admin.from("dsr_request_events").insert({
    dsr_request_id: data.id,
    event_type: "request_received",
    actor_id: userId,
    actor_email: requesterEmail,
    summary: "Account deletion request received from Settings",
    details: { blockers: preview.blockers, source: "delete-account" },
  });

  return data.id;
}

async function removeStoragePathsInChunks(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  paths: StorageDeletePath[],
): Promise<{ removed: number; failures: string[] }> {
  let removed = 0;
  const failures: string[] = [];

  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_CHUNK_SIZE) {
    const chunk = paths.slice(i, i + STORAGE_REMOVE_CHUNK_SIZE);
    const byBucket = new Map<string, string[]>();
    for (const item of chunk) {
      const list = byBucket.get(item.bucket) ?? [];
      list.push(item.path);
      byBucket.set(item.bucket, list);
    }

    for (const [bucket, objectPaths] of byBucket.entries()) {
      const { error } = await admin.storage.from(bucket).remove(objectPaths);
      if (error) {
        failures.push(`${bucket}: ${error.message}`);
      } else {
        removed += objectPaths.length;
      }
    }
  }

  return { removed, failures };
}

export async function handleDeleteAccountRequest(req: Request): Promise<Response> {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  try {
    const userClient = createUserSupabaseClient(req);
    const auth = await requireUser(req, userClient);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status, { req });
    }

    const { user } = auth;
    const admin = createAdminSupabaseClient();

    let body: DeleteAccountRequest = {};
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400, { req });
    }

    const { data: previewData, error: previewError } = await admin.rpc(
      "preview_account_deletion",
      { p_user_id: user.id },
    );

    if (previewError) {
      console.error("[DELETE-ACCOUNT] Preview failed:", previewError.message);
      return createErrorResponse("Failed to preview account deletion", 500, { req });
    }

    const preview = previewData as PreviewResult;

    if (body.dryRunOnly) {
      return createJsonResponse(
        {
          success: true,
          dryRunOnly: true,
          preview,
        },
        200,
        { req },
      );
    }

    if (!preview.eligible_for_self_service) {
      const dsrRequestId = await upsertDeletionDsrCase(admin, user.id, preview, "received");
      return createJsonResponse(
        {
          success: false,
          blocked: true,
          preview,
          dsrRequestId,
          message:
            "Your account cannot be deleted automatically yet. A deletion request has been recorded for manual review.",
        },
        409,
        { req },
      );
    }

    const confirmationText = body.confirmationText?.trim();
    if (confirmationText !== CONFIRMATION_PHRASE) {
      return createErrorResponse(
        `Confirmation text must exactly match "${CONFIRMATION_PHRASE}"`,
        400,
        { req },
      );
    }

    const expectedEmail = normalizeEmail(body.expectedUserEmail);
    const actualEmail = normalizeEmail(user.email ?? preview.requester_email);
    if (!expectedEmail || expectedEmail !== actualEmail) {
      return createErrorResponse("Expected account email does not match the signed-in user", 400, {
        req,
      });
    }

    const dsrRequestId = await upsertDeletionDsrCase(admin, user.id, preview, "verifying");
    if (!dsrRequestId) {
      return createErrorResponse("Failed to create deletion request record", 500, { req });
    }

    const { data: prepData, error: prepError } = await admin.rpc("prepare_account_deletion", {
      p_user_id: user.id,
      p_dsr_request_id: dsrRequestId,
      p_actor_id: user.id,
    });

    if (prepError) {
      console.error("[DELETE-ACCOUNT] Prepare failed:", prepError.message);
      return createErrorResponse("Failed to prepare account deletion", 500, { req });
    }

    const { data: storageMeta, error: storageMetaError } = await admin.rpc(
      "apply_account_deletion_storage_metadata",
      { p_user_id: user.id },
    );

    if (storageMetaError) {
      console.error("[DELETE-ACCOUNT] Storage metadata failed:", storageMetaError.message);
      return createErrorResponse("Failed to prepare storage cleanup", 500, { req });
    }

    const deletePaths = ((storageMeta as { delete_paths?: StorageDeletePath[] })?.delete_paths ??
      []) as StorageDeletePath[];

    const avatarPrefixPaths: StorageDeletePath[] = [];
    const { data: avatarList } = await admin.storage.from("user-avatars").list(user.id, {
      limit: 1000,
    });
    if (avatarList) {
      for (const item of avatarList) {
        if (item.name) {
          avatarPrefixPaths.push({ bucket: "user-avatars", path: `${user.id}/${item.name}` });
        }
      }
    }

    const allDeletePaths = [...deletePaths, ...avatarPrefixPaths];
    const storageResult = await removeStoragePathsInChunks(admin, allDeletePaths);
    if (storageResult.failures.length > 0) {
      await admin.from("dsr_request_events").insert({
        dsr_request_id: dsrRequestId,
        event_type: "fulfillment_step_completed",
        actor_id: user.id,
        actor_email: user.email,
        summary: "Storage cleanup failed",
        details: {
          domain: "storage",
          failures: storageResult.failures,
          removed_count: storageResult.removed,
        },
      });

      return createErrorResponse(
        "Account deletion stopped because personal storage cleanup failed. You can retry shortly.",
        502,
        { req },
      );
    }

    await admin.from("dsr_request_events").insert({
      dsr_request_id: dsrRequestId,
      event_type: "fulfillment_step_completed",
      actor_id: user.id,
      actor_email: user.email,
      summary: "Storage cleanup completed",
      details: {
        domain: "storage",
        removed_count: storageResult.removed,
        reassigned_metadata: storageMeta,
      },
    });

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error("[DELETE-ACCOUNT] Auth delete failed:", authDeleteError.message);
      await admin.from("dsr_request_events").insert({
        dsr_request_id: dsrRequestId,
        event_type: "fulfillment_step_completed",
        actor_id: user.id,
        actor_email: user.email,
        summary: "Auth user deletion failed",
        details: { domain: "auth", error: authDeleteError.message },
      });
      return createErrorResponse("Failed to delete authentication account", 502, { req });
    }

    const receiptError = await admin.from("dsr_request_events").insert({
      dsr_request_id: dsrRequestId,
      event_type: "fulfillment_step_completed",
      actor_id: null,
      actor_email: null,
      summary: "Self-service account deletion completed",
      details: {
        domain: "auth",
        prep: prepData,
        storage_removed: storageResult.removed,
      },
    }).then(({ error }) => error);

    if (receiptError) {
      console.error("[DELETE-ACCOUNT] Final receipt failed:", receiptError.message);
    }

    await admin
      .from("dsr_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: null,
        verification_method: "authenticated_match",
      })
      .eq("id", dsrRequestId);

    return createJsonResponse(
      {
        success: true,
        deleted: true,
        dsrRequestId,
        preview,
        prep: prepData,
        storageRemoved: storageResult.removed,
        receiptWarning: receiptError ? "Deletion succeeded but final receipt write failed" : null,
      },
      200,
      { req },
    );
  } catch (err) {
    console.error("[DELETE-ACCOUNT] Unexpected error:", err);
    return createErrorResponse("Failed to delete account", 500, { req });
  }
}

export const __testables = {
  CONFIRMATION_PHRASE,
  normalizeEmail,
  removeStoragePathsInChunks,
};

if (import.meta.main) {
  Deno.serve(withCorrelationId(handleDeleteAccountRequest));
}
