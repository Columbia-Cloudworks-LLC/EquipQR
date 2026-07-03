/**
 * Work order export authorization — org admin (full) vs team-scoped requestor/viewer.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { verifyOrgAdmin } from "./supabase-clients.ts";

export type WorkOrderExportAccess =
  | { mode: "admin" }
  | { mode: "scoped"; equipmentIds: string[] };

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
  if (teamIds.length === 0) {
    return { mode: "scoped", equipmentIds: [] };
  }

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("id")
    .eq("organization_id", organizationId)
    .in("team_id", teamIds);

  if (equipmentError) {
    return null;
  }

  const equipmentIds = (equipment ?? []).map((row) => row.id as string);
  return { mode: "scoped", equipmentIds };
}

export function isWorkOrderEquipmentAccessible(
  access: WorkOrderExportAccess,
  equipmentId: string | null | undefined,
): boolean {
  if (!equipmentId) {
    return false;
  }
  if (access.mode === "admin") {
    return true;
  }
  return access.equipmentIds.includes(equipmentId);
}

export const __workOrderExportAuthTestables = {
  SCOPED_TEAM_ROLES,
};
