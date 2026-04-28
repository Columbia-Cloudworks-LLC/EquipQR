import { supabase } from '@/integrations/supabase/client';

export type QRActionType = 'pm-work-order' | 'generic-work-order' | 'update-hours' | 'note-image';
export type QRUserRole = 'owner' | 'admin' | 'member' | string;
export type QRTeamRole = 'manager' | 'technician' | 'requestor' | 'viewer' | string;

export interface QRActionTeamMembership {
  teamId: string;
  role: QRTeamRole;
}

export interface QRActionPermissionContext {
  userId: string;
  organizationId: string;
  userRole: QRUserRole;
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

function isOrgAdmin(userRole: QRUserRole): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

function isActiveOrgMember(userRole: QRUserRole): boolean {
  return isOrgAdmin(userRole) || userRole === 'member';
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
  userId: string,
  organizationId: string,
  userRole: QRUserRole,
  equipmentTeamId: string | null | undefined
): Promise<QRActionTeamMembership[]> {
  if (!equipmentTeamId || isOrgAdmin(userRole)) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_user_team_memberships', {
    user_uuid: userId,
    org_id: organizationId,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map(membership => ({
    teamId: membership.team_id,
    role: membership.role,
  }));
}
