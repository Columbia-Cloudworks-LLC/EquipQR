import { supabase } from '@/integrations/supabase/client';
import type { Role, TeamRole } from '@/types/permissions';
import { getAuthClaims } from '@/lib/authClaims';

export type QRActionType = 'pm-work-order' | 'generic-work-order' | 'update-hours' | 'note-image';

export interface QRActionTeamMembership {
  teamId: string;
  role: TeamRole;
}

export interface QRActionPermissionContext {
  userId: string;
  organizationId: string;
  userRole: Role;
  teamMemberships: QRActionTeamMembership[];
}

export interface QRActionEquipment {
  id: string;
  name: string;
  organizationId: string;
  teamId: string | null;
  workingHours: number | null;
  defaultPmTemplateId: string | null;
}

function isOrgAdmin(userRole: Role): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

/** Active org members may use QR quick actions; org viewers are excluded. */
function isActiveOrgMember(userRole: Role): boolean {
  return isOrgAdmin(userRole) || userRole === 'member' || userRole === 'manager';
}

function getMembershipForTeam(
  teamMemberships: QRActionTeamMembership[],
  teamId: string | null | undefined
): QRActionTeamMembership | null {
  if (!teamId) return null;
  return teamMemberships.find(membership => membership.teamId === teamId) ?? null;
}

export function canRunQRAction(
  action: QRActionType,
  context: QRActionPermissionContext,
  equipmentTeamId: string | null | undefined
): boolean {
  if (!isActiveOrgMember(context.userRole)) return false;
  if (isOrgAdmin(context.userRole)) return true;

  const teamMembership = getMembershipForTeam(context.teamMemberships, equipmentTeamId);

  if (action === 'update-hours') {
    return teamMembership?.role === 'manager';
  }

  if (!equipmentTeamId) return true;
  return !!teamMembership;
}

export async function fetchQRActionTeamMemberships(
  organizationId: string,
  userRole: Role,
  equipmentTeamId: string | null | undefined
): Promise<QRActionTeamMembership[]> {
  if (!equipmentTeamId || isOrgAdmin(userRole)) {
    return [];
  }

  const claims = await getAuthClaims();
  if (!claims?.sub) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_user_team_memberships', {
    user_uuid: claims.sub,
    org_id: organizationId,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map(membership => ({
    teamId: membership.team_id,
    role: membership.role,
  }));
}
