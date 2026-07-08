/**
 * Public quick form auth gate (#1184).
 *
 * Callers authenticate with the per-form QR token (not a Supabase session).
 * This helper must run before any service-role work — same contract as
 * requireOperatorCheckinAssignmentToken for operator daily check-ins.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { hashToken } from "./operator-checklist-validation.ts";
import { assertQuickFormSnapshot } from "./quick-form-validation.ts";

export const MIN_PUBLIC_QUICK_FORM_TOKEN_LENGTH = 32;
export const MAX_PUBLIC_QUICK_FORM_TOKEN_LENGTH = 128;

export interface ResolvedQuickForm {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  form_data: unknown;
  is_active: boolean;
  organization_name: string;
}

export function isValidPublicQuickFormToken(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length >= MIN_PUBLIC_QUICK_FORM_TOKEN_LENGTH &&
    trimmed.length <= MAX_PUBLIC_QUICK_FORM_TOKEN_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(trimmed)
  );
}

export type QuickFormTokenAuthResult =
  | { ok: true; form: ResolvedQuickForm; tokenHash: string }
  | { ok: false; error: string; status: number };

/** Validates the form token and resolves form metadata via anon/authenticated RPC. */
export async function requireQuickFormToken(
  supabase: SupabaseClient,
  token: string,
): Promise<QuickFormTokenAuthResult> {
  if (!isValidPublicQuickFormToken(token)) {
    return { ok: false, error: "Form is not available", status: 404 };
  }

  const tokenHash = await hashToken(token.trim());
  const { data, error } = await supabase.rpc("resolve_quick_form_by_token", {
    p_token_hash: tokenHash,
  });

  if (error) {
    console.error("[QUICK-FORM] form lookup failed:", error.message);
    return { ok: false, error: "Form is not available", status: 404 };
  }

  const form = data as ResolvedQuickForm | null;
  if (!form || form.is_active === false) {
    return { ok: false, error: "Form is not available", status: 404 };
  }

  // Reject malformed snapshots early so downstream validation stays consistent.
  try {
    assertQuickFormSnapshot(form.form_data);
  } catch {
    return { ok: false, error: "Form is not available", status: 404 };
  }

  return { ok: true, form, tokenHash };
}
