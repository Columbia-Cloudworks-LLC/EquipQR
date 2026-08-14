/**
 * Application-layer team RBAC used when RLS is org-wide (any org member can
 * SELECT). Org owners/admins see every team in the current org. Everyone else
 * is limited to teams they belong to. Unassigned records are admin-only.
 */
export function isRecordOnAccessibleTeam(
  isOrgAdmin: boolean,
  userTeamIds: readonly string[],
  recordTeamId: string | null | undefined,
): boolean {
  if (isOrgAdmin) return true;
  if (!recordTeamId) return false;
  return userTeamIds.includes(recordTeamId);
}

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
