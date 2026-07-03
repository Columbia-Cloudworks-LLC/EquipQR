import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { TeamRole } from '@/types/permissions';

export type TeamMembershipRole = {
  teamId?: string;
  team_id?: string;
  role: TeamRole | string;
};

export type WorkOrderNotePermissionInput = {
  status: WorkOrderStatus | string;
  teamId?: string | null;
  createdBy?: string | null;
  userId?: string | null;
  isOrgAdmin: boolean;
  teamMemberships: readonly TeamMembershipRole[];
};

const FIELD_TEAM_ROLES: ReadonlySet<TeamRole> = new Set(['manager', 'technician']);
const NOTE_AUTHOR_TEAM_ROLES: ReadonlySet<TeamRole> = new Set(['manager', 'technician', 'requestor']);

export function isWorkOrderCancelled(status: WorkOrderStatus | string): boolean {
  return status === 'cancelled';
}

export function isWorkOrderEditLocked(status: WorkOrderStatus | string): boolean {
  return status === 'completed' || status === 'cancelled';
}

function membershipTeamId(membership: TeamMembershipRole): string | undefined {
  return membership.teamId ?? membership.team_id;
}

function teamRoleOnWorkOrder(
  teamMemberships: readonly TeamMembershipRole[],
  teamId?: string | null,
): string | undefined {
  if (!teamId) return undefined;
  return teamMemberships.find((membership) => membershipTeamId(membership) === teamId)?.role;
}

export function canUsePrivateWorkOrderNotes(input: WorkOrderNotePermissionInput): boolean {
  if (input.isOrgAdmin) {
    return true;
  }

  const teamRole = teamRoleOnWorkOrder(input.teamMemberships, input.teamId);
  return teamRole !== undefined && FIELD_TEAM_ROLES.has(teamRole as TeamRole);
}

export function canAddWorkOrderNotes(input: WorkOrderNotePermissionInput): boolean {
  if (isWorkOrderCancelled(input.status)) {
    return false;
  }

  if (input.isOrgAdmin) {
    return true;
  }

  if (input.userId && input.createdBy === input.userId) {
    return true;
  }

  const teamRole = teamRoleOnWorkOrder(input.teamMemberships, input.teamId);
  return teamRole !== undefined && NOTE_AUTHOR_TEAM_ROLES.has(teamRole as TeamRole);
}
