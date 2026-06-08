/**
 * Shared database helpers for DSR request management.
 */

import {
  createAdminSupabaseClient,
  verifyOrgMembership,
} from "../_shared/supabase-clients.ts";
import type { DsrRequestRow } from "./dsr-action-types.ts";

export type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export async function getOrgRole(
  admin: AdminClient,
  userId: string,
  organizationId: string,
): Promise<"owner" | "admin" | "member" | null> {
  const membership = await verifyOrgMembership(admin, userId, organizationId);
  if (!membership.isMember || !membership.role) {
    return null;
  }
  return membership.role as "owner" | "admin" | "member";
}

export async function logEvent(
  admin: AdminClient,
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

export async function updateWithConcurrency(
  admin: AdminClient,
  dsrRequestId: string,
  organizationId: string,
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
    .eq("organization_id", organizationId)
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

export async function fetchRequest(
  admin: AdminClient,
  dsrRequestId: string,
  organizationId: string,
): Promise<DsrRequestRow | null> {
  const { data, error } = await admin
    .from("dsr_requests")
    .select("*")
    .eq("id", dsrRequestId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as DsrRequestRow;
}

export async function sendLifecycleNotice(
  admin: AdminClient,
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
