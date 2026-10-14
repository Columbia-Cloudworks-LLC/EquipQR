/**
 * EquipQR operator allowlist (issue #1648 review).
 *
 * Operators are specific user accounts, never an organization. Their user IDs
 * live in the DFY_OPERATOR_USER_IDS Edge secret (comma-separated, synced from
 * the GitHub `production` / `preview` environments). A missing, empty, or
 * malformed allowlist grants nothing.
 *
 * Call this only after requireUser(): it trusts the User object returned by
 * auth.getUser(), not JWT claims.
 */

import type { User } from "npm:@supabase/supabase-js@2.45.0";

export const DFY_OPERATOR_USER_IDS_ENV = "DFY_OPERATOR_USER_IDS";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Parse the comma-separated allowlist. Malformed entries are dropped. */
export function parseOperatorUserIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const ids = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim().toLowerCase();
    if (UUID_RE.test(id)) ids.add(id);
  }
  return [...ids];
}

/** Operator user IDs from the environment ([] when unset or empty). */
export function getOperatorUserIds(): string[] {
  return parseOperatorUserIds(Deno.env.get(DFY_OPERATOR_USER_IDS_ENV));
}

type OperatorCandidate = Pick<User, "id" | "email_confirmed_at">;

/** True only for an allowlisted user ID whose email is confirmed. */
export function isDfyOperator(
  user: OperatorCandidate,
  operatorIds: readonly string[] = getOperatorUserIds(),
): boolean {
  if (operatorIds.length === 0) return false;
  if (!user.email_confirmed_at) return false;
  return operatorIds.includes(user.id.toLowerCase());
}
