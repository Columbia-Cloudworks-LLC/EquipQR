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
  return isOrgAdmin(userRole) || userRole === 'member' || (userRole as string) === 'manager';
}

function getMembershipForTeam(
  teamMemberships: QRActionTeamMembership[],
  teamId: string | null | undefined
): QRActionTeamMembership | null {
  if (!teamId) return null;
  return teamMemberships.find(membership => membership.teamId === teamId) ?? null;
}

/** Team roles that may create work orders from the QR scan flow (excludes read-only viewer). */
const QR_WORK_ORDER_TEAM_ROLES: readonly TeamRole[] = ['manager', 'technician', 'requestor'];

/** Team roles that may add notes or images from the QR scan flow (field documentation). */
const QR_NOTE_IMAGE_TEAM_ROLES: readonly TeamRole[] = ['manager', 'technician'];

function teamRoleCanCreateQrWorkOrder(role: TeamRole | undefined): boolean {
  return role !== undefined && QR_WORK_ORDER_TEAM_ROLES.includes(role);
}

function teamRoleCanAddQrNoteImage(role: TeamRole | undefined): boolean {
  return role !== undefined && QR_NOTE_IMAGE_TEAM_ROLES.includes(role);
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

  if (!teamMembership) return false;

  if (action === 'pm-work-order' || action === 'generic-work-order') {
    return teamRoleCanCreateQrWorkOrder(teamMembership.role);
  }

  if (action === 'note-image') {
    return teamRoleCanAddQrNoteImage(teamMembership.role);
  }

  return false;
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
