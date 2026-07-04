/**
 * Work order export authorization — org admin (full) vs team-scoped requestor/viewer.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { verifyOrgAdmin } from "./supabase-clients.ts";

export type WorkOrderExportAccess =
  | { mode: "admin" }
  | { mode: "scoped"; teamIds: string[] };

const SCOPED_TEAM_ROLES = ["requestor", "viewer"] as const;

export async function resolveWorkOrderExportAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<WorkOrderExportAccess | null> {
  if (await verifyOrgAdmin(supabase, userId, organizationId)) {
    return { mode: "admin" };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, role, teams!inner(organization_id)")
    .eq("user_id", userId)
    .eq("teams.organization_id", organizationId)
    .in("role", [...SCOPED_TEAM_ROLES]);

  if (membershipError || !memberships?.length) {
    return null;
  }

  const teamIds = [...new Set(memberships.map((row) => row.team_id as string))];
  return { mode: "scoped", teamIds };
}

export function isWorkOrderExportAccessible(
  access: WorkOrderExportAccess,
  teamId: string | null | undefined,
  equipmentId: string | null | undefined,
): boolean {
  if (!equipmentId) {
    return false;
  }
  if (access.mode === "admin") {
    return true;
  }
  if (!teamId) {
    return false;
  }
  return access.teamIds.includes(teamId);
}

export const __workOrderExportAuthTestables = {
  SCOPED_TEAM_ROLES,
};
