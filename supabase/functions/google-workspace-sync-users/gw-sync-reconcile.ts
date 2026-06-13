import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export interface ReconcileResult {
  directory_marked_suspended: number;
  members_deactivated: number;
  claims_revoked: number;
}

const EMPTY_RECONCILE_RESULT: ReconcileResult = {
  directory_marked_suspended: 0,
  members_deactivated: 0,
  claims_revoked: 0,
};

/** Detect PostgREST/Postgres errors when the timestamptz reconcile RPC is not deployed yet. */
export function isReconcileRpcSchemaDriftError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the function")
    || (normalized.includes("reconcile_google_workspace_directory") && normalized.includes("does not exist"))
    || (normalized.includes("reconcile_google_workspace_directory") && normalized.includes("schema cache"))
    || (normalized.includes("p_sync_started_at") && normalized.includes("does not exist"))
  );
}

type RpcErrorShape = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export class ReconcileRpcError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(error: RpcErrorShape) {
    super(error.message ?? "Directory reconcile RPC failed");
    this.name = "ReconcileRpcError";
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

export function toReconcileRpcError(error: RpcErrorShape): ReconcileRpcError {
  return new ReconcileRpcError(error);
}

export function formatReconcileErrorForLog(error: unknown): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  if (error instanceof ReconcileRpcError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const rpcError = error as RpcErrorShape;
    return {
      message: String(rpcError.message ?? "Directory reconcile RPC failed"),
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
    };
  }

  return { message: String(error) };
}

export async function reconcileGoogleWorkspaceDirectory(
  adminClient: SupabaseClient,
  params: { organizationId: string; syncStartedAt: string },
): Promise<{ reconcile: ReconcileResult; skippedDueToSchemaDrift: boolean }> {
  const { data, error } = await adminClient.rpc("reconcile_google_workspace_directory", {
    p_organization_id: params.organizationId,
    p_sync_started_at: params.syncStartedAt,
  });

  if (!error) {
    return {
      reconcile: (data ?? EMPTY_RECONCILE_RESULT) as ReconcileResult,
      skippedDueToSchemaDrift: false,
    };
  }

  if (isReconcileRpcSchemaDriftError(error.message)) {
    return { reconcile: EMPTY_RECONCILE_RESULT, skippedDueToSchemaDrift: true };
  }

  throw toReconcileRpcError(error);
}

export const __gwSyncReconcileTestables = {
  isReconcileRpcSchemaDriftError,
  toReconcileRpcError,
  formatReconcileErrorForLog,
};
