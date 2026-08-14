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

/** Work orders must match every present team id (WO team and equipment team). */
export function areRecordsOnAccessibleTeam(
  isOrgAdmin: boolean,
  userTeamIds: readonly string[],
  ...recordTeamIds: Array<string | null | undefined>
): boolean {
  if (isOrgAdmin) return true;
  const presentIds = recordTeamIds.filter((id): id is string => Boolean(id));
  if (presentIds.length === 0) return false;
  return presentIds.every((id) => userTeamIds.includes(id));
}

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export type TeamReadScope = {
  isOrgAdmin: boolean;
  userTeamIds?: string[];
};

/**
 * Missing RBAC inputs fail closed for non-admins (empty team list, no org-wide read).
 * Org admins omit `userTeamIds` so the service does not apply a team filter.
 */
export function resolveTeamReadScope(options?: {
  isOrgAdmin?: boolean;
  userTeamIds?: readonly string[];
}): TeamReadScope {
  if (options?.isOrgAdmin) {
    return { isOrgAdmin: true };
  }
  return {
    isOrgAdmin: false,
    userTeamIds: options?.userTeamIds ? [...options.userTeamIds] : [],
  };
}

/** Stable TanStack Query key segment so persisted by-id caches do not leak across RBAC. */
export function teamAccessQueryScope(
  isOrgAdmin?: boolean,
  userTeamIds?: readonly string[],
): string {
  const scope = resolveTeamReadScope({ isOrgAdmin, userTeamIds });
  if (scope.isOrgAdmin) return 'admin';
  if (!scope.userTeamIds || scope.userTeamIds.length === 0) return 'none';
  return [...scope.userTeamIds].sort().join(',');
}
