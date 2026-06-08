import type { SessionData } from '@/types/session';
import { getSessionVersion } from '@/utils/sessionPersistence';

export function buildEmptySessionData(): SessionData {
  return {
    organizations: [],
    currentOrganizationId: null,
    teamMemberships: [],
    lastUpdated: new Date().toISOString(),
    version: getSessionVersion(),
  };
}

export function shouldSkipSessionRefresh(force: boolean, lastRefreshTime: string | null): boolean {
  if (force || !lastRefreshTime) {
    return false;
  }

  const lastRefresh = new Date(lastRefreshTime);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastRefresh > fiveMinutesAgo;
}

export function resolvePrioritizedOrgId(
  preserveOrgSelection: boolean,
  storedCurrentOrgId: string | null | undefined,
  preferredOrgId: string | null | undefined
): string | null | undefined {
  if (preserveOrgSelection && storedCurrentOrgId) {
    return storedCurrentOrgId;
  }
  return preferredOrgId;
}
