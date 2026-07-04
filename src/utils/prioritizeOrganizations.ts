export interface PrioritizableOrganization {
  id: string;
  userRole: string;
  isPersonal?: boolean;
}

/**
 * Picks the default organization for a user session.
 * Non-personal (workspace) orgs win over the personal org; then owner > admin > member.
 */
export function getPrioritizedOrganizationId(
  orgs: PrioritizableOrganization[],
): string {
  if (orgs.length === 0) {
    return '';
  }

  const roleWeight: Record<string, number> = { owner: 3, admin: 2, member: 1 };

  const prioritized = [...orgs].sort((a, b) => {
    const aIsPersonal = a.isPersonal === true;
    const bIsPersonal = b.isPersonal === true;

    if (aIsPersonal !== bIsPersonal) {
      return aIsPersonal ? 1 : -1;
    }

    return (roleWeight[b.userRole] || 0) - (roleWeight[a.userRole] || 0);
  });

  return prioritized[0].id;
}

export function withPersonalOrgFlag<T extends { id: string }>(
  orgs: T[],
  personalOrgId: string | null,
): Array<T & { isPersonal: boolean }> {
  return orgs.map((org) => ({
    ...org,
    isPersonal: personalOrgId !== null && org.id === personalOrgId,
  }));
}
