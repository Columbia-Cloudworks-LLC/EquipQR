/**
 * DSR export artifact request and retry actions.
 */

import { createErrorResponse } from "../_shared/supabase-clients.ts";
import type { DsrRequestRow } from "./dsr-action-types.ts";
import type { AdminClient } from "./dsr-db-helpers.ts";
import { logEvent, updateWithConcurrency } from "./dsr-db-helpers.ts";

const EXPORT_RETRY_LIMIT = 3;

export async function handleRequestExport(
  admin: AdminClient,
  dsr: DsrRequestRow,
  dsrRequestId: string,
  organizationId: string,
  expectedUpdatedAt: string,
  userId: string,
  userEmail: string | null | undefined,
  details?: Record<string, unknown>,
): Promise<Response | null> {
  const previous = (dsr.export_artifacts ?? {}) as Record<string, unknown>;
  const previousVersion = typeof previous.version === "number" ? previous.version : 0;
  const version = previousVersion + 1;
  const nowIso = new Date().toISOString();
  const simulateFailure = Boolean(details?.simulateFailure);
  const keepPending = Boolean(details?.keepPending);
  const retryCount = typeof previous.retry_count === "number" ? previous.retry_count : 0;

  const metadata: Record<string, unknown> = {
    version,
    requested_by: userId,
    requested_at: nowIso,
    generated_at: keepPending || simulateFailure ? null : nowIso,
    checksum_sha256: keepPending || simulateFailure ? null : crypto.randomUUID().replaceAll("-", ""),
    status: keepPending ? "pending" : (simulateFailure ? "failed" : "ready"),
    retry_count: simulateFailure ? retryCount + 1 : retryCount,
    last_error: simulateFailure ? "Export generation failed" : null,
  };

  const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
    export_artifacts: metadata,
  });
  if (result.conflict) return createErrorResponse("Conflict", 409);
  if (!result.ok) return createErrorResponse("Failed to request export", 500);

  await logEvent(
    admin,
    dsrRequestId,
    "export_requested",
    userId,
    userEmail,
    `Export requested (v${version})`,
    { version },
  );

  await logEvent(
    admin,
    dsrRequestId,
    simulateFailure ? "export_failed" : (keepPending ? "export_requested" : "export_ready"),
    userId,
    userEmail,
    simulateFailure ? `Export failed (v${version})` : `Export ${keepPending ? "pending" : "ready"} (v${version})`,
    { version },
  );

  return null;
}

export async function handleRetryExport(
  admin: AdminClient,
  dsr: DsrRequestRow,
  dsrRequestId: string,
  organizationId: string,
  expectedUpdatedAt: string,
  userId: string,
  userEmail: string | null | undefined,
): Promise<Response | null> {
  const current = (dsr.export_artifacts ?? {}) as Record<string, unknown>;
  const retryCount = typeof current.retry_count === "number" ? current.retry_count : 0;
  if (retryCount >= EXPORT_RETRY_LIMIT) {
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

  const result = await updateWithConcurrency(admin, dsrRequestId, organizationId, expectedUpdatedAt, {
    export_artifacts: metadata,
  });
  if (result.conflict) return createErrorResponse("Conflict", 409);
  if (!result.ok) return createErrorResponse("Failed to retry export", 500);

  await logEvent(
    admin,
    dsrRequestId,
    "export_ready",
    userId,
    userEmail,
    `Export ready after retry (v${version})`,
    { version, retry_count: retryCount + 1 },
  );

  return null;
}
