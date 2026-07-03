export type TeamMembershipRole = {
  teamId: string;
  role: string;
};

export type WorkOrderNotePermissionInput = {
  status: string;
  teamId?: string | null;
  createdBy?: string | null;
  userId?: string | null;
  isOrgAdmin: boolean;
  teamMemberships: readonly TeamMembershipRole[];
};

const FIELD_TEAM_ROLES = new Set(['manager', 'technician']);
const NOTE_AUTHOR_TEAM_ROLES = new Set(['manager', 'technician', 'requestor']);

export function isWorkOrderCancelled(status: string): boolean {
  return status === 'cancelled';
}

export function isWorkOrderEditLocked(status: string): boolean {
  return status === 'completed' || status === 'cancelled';
}

function teamRoleOnWorkOrder(
  teamMemberships: readonly TeamMembershipRole[],
  teamId?: string | null,
): string | undefined {
  if (!teamId) return undefined;
  return teamMemberships.find((membership) => membership.teamId === teamId)?.role;
}

export function canUsePrivateWorkOrderNotes(input: WorkOrderNotePermissionInput): boolean {
  if (input.isOrgAdmin) {
    return true;
  }

  const teamRole = teamRoleOnWorkOrder(input.teamMemberships, input.teamId);
  return teamRole !== undefined && FIELD_TEAM_ROLES.has(teamRole);
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
  return teamRole !== undefined && NOTE_AUTHOR_TEAM_ROLES.has(teamRole);
}
