/**
 * Public operator check-in auth gate (#1091).
 *
 * Callers authenticate with the per-assignment QR token (not a Supabase session).
 * This helper must run before any service-role work — same contract as requireUser
 * for session-backed functions and submit-privacy-request for anonymous DSR intake.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { hashToken } from "./operator-checklist-validation.ts";

export const MIN_PUBLIC_OPERATOR_CHECKIN_TOKEN_LENGTH = 32;
export const MAX_PUBLIC_OPERATOR_CHECKIN_TOKEN_LENGTH = 128;

export type ResolvedOperatorCheckinSettings = Record<string, unknown>;

export function isValidPublicOperatorCheckinToken(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length >= MIN_PUBLIC_OPERATOR_CHECKIN_TOKEN_LENGTH &&
    trimmed.length <= MAX_PUBLIC_OPERATOR_CHECKIN_TOKEN_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(trimmed)
  );
}

export type OperatorCheckinTokenAuthResult =
  | { ok: true; settings: ResolvedOperatorCheckinSettings; tokenHash: string }
  | { ok: false; error: string; status: number };

/** Validates the assignment token and resolves template/equipment context via anon RPC. */
export async function requireOperatorCheckinAssignmentToken(
  supabase: SupabaseClient,
  token: string,
): Promise<OperatorCheckinTokenAuthResult> {
  if (!isValidPublicOperatorCheckinToken(token)) {
    return { ok: false, error: "Check-in is not available", status: 404 };
  }

  const tokenHash = await hashToken(token.trim());
  const { data, error } = await supabase.rpc("resolve_operator_checkin_by_token", {
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error("[OPERATOR-CHECKIN] settings lookup failed:", error.message);
    return { ok: false, error: "Check-in is not available", status: 404 };
  }

  const settings = data as ResolvedOperatorCheckinSettings | null;
  if (!settings?.enabled || !settings.template) {
    return { ok: false, error: "Check-in is not available", status: 404 };
  }

  const template = settings.template as Record<string, unknown>;
  if (template.is_active === false) {
    return { ok: false, error: "Check-in is not available", status: 404 };
  }

  return { ok: true, settings, tokenHash };
}
