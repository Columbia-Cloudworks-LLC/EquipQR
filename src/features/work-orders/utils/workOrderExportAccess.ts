import type { TeamRole } from '@/types/permissions';

const SCOPED_EXPORT_TEAM_ROLES: TeamRole[] = ['requestor', 'viewer'];

export type WorkOrderExportAudience = 'admin' | 'customer-safe' | 'none';

export interface TeamMembershipExportInput {
  role: TeamRole;
}

export function hasScopedWorkOrderExportTeamRole(
  teamMemberships: TeamMembershipExportInput[],
): boolean {
  return teamMemberships.some((membership) =>
    SCOPED_EXPORT_TEAM_ROLES.includes(membership.role),
  );
}

export function resolveWorkOrderExportAudience(
  isOrgAdmin: boolean,
  teamMemberships: TeamMembershipExportInput[],
): WorkOrderExportAudience {
  if (isOrgAdmin) {
    return 'admin';
  }
  if (hasScopedWorkOrderExportTeamRole(teamMemberships)) {
    return 'customer-safe';
  }
  return 'none';
}

export function canAccessScopedReportsExport(
  isOrgAdmin: boolean,
  teamMemberships: TeamMembershipExportInput[],
): boolean {
  return isOrgAdmin || hasScopedWorkOrderExportTeamRole(teamMemberships);
}
