import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useSessionManager } from '@/hooks/useSessionManager';
import { SessionStorageService } from '@/services/sessionStorageService';
import { SessionPermissionService } from '@/services/sessionPermissionService';
import { SessionDataService } from '@/services/sessionDataService';
import { getOrganizationPreference } from '@/utils/sessionPersistence';
import type { SessionData, SessionOrganization } from '@/types/session';

export type { SessionData, SessionOrganization } from '@/types/session';

interface SessionContextType {
  sessionData: SessionData | null;
  isLoading: boolean;
  error: string | null;
  getCurrentOrganization: () => SessionOrganization | null;
  switchOrganization: (organizationId: string) => void;
  hasTeamRole: (teamId: string, role: string) => boolean;
  hasTeamAccess: (teamId: string) => boolean;
  canManageTeam: (teamId: string) => boolean;
  getUserTeamIds: () => string[];
  refreshSession: (force?: boolean) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export { SessionContext };

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Destructure stable functions from sessionManager to avoid recreating on every render
  const {
    refreshSession: managerRefresh,
    switchOrganization: managerSwitchOrganization,
    shouldRefreshOnVisibility,
    initializeSession
  } = useSessionManager({
    user,
    authLoading,
    onSessionUpdate: setSessionData,
    onError: setError
  });

  const clearSession = useCallback(() => {
    setSessionData(null);
    SessionStorageService.clearSessionStorage();
  }, []);

  const getCurrentOrganization = useCallback((): SessionOrganization | null => {
    return SessionPermissionService.getCurrentOrganization(sessionData);
  }, [sessionData]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    await managerSwitchOrganization(organizationId, sessionData);
  }, [managerSwitchOrganization, sessionData]);

  const hasTeamRole = useCallback((teamId: string, role: string): boolean => {
    return SessionPermissionService.hasTeamRole(sessionData, teamId, role);
  }, [sessionData]);

  const hasTeamAccess = useCallback((teamId: string): boolean => {
    return SessionPermissionService.hasTeamAccess(sessionData, teamId);
  }, [sessionData]);

  const canManageTeam = useCallback((teamId: string): boolean => {
    const currentOrg = getCurrentOrganization();
    return SessionPermissionService.canManageTeam(sessionData, currentOrg, teamId);
  }, [sessionData, getCurrentOrganization]);

  const getUserTeamIds = useCallback((): string[] => {
    return SessionPermissionService.getUserTeamIds(sessionData);
  }, [sessionData]);

  const refreshSession = useCallback(async (force: boolean = false) => {
    try {
      setIsLoading(force);
      await managerRefresh(force);
    } finally {
      setIsLoading(false);
    }
  }, [managerRefresh]);

  // Page visibility handling - more conservative approach
  usePageVisibility({
    onVisibilityChange: (isVisible) => {
      if (shouldRefreshOnVisibility(isVisible)) {
        // Refreshing session due to page visibility change
        refreshSession(false);
      }
    },
    debounceMs: 2000 // Increased debounce for better performance
  });

  // Initialize session on mount or user change. Do not clear storage while auth is loading
  // (e.g. on refresh) so that org preference and session cache persist across page reloads.
  useEffect(() => {
    const result = initializeSession();

    if (result.waitForAuth) {
      return;
    }

    if (result.shouldLoadFromCache && result.cachedData) {
      const preferredOrgId = getOrganizationPreference()?.selectedOrgId ?? null;
      let hydrated = result.cachedData;
      const preferredIsMember =
        !!preferredOrgId &&
        hydrated.organizations.some((org) => org.id === preferredOrgId);
      if (preferredIsMember && preferredOrgId !== hydrated.currentOrganizationId) {
        // Org preference (or E2E pin) outranks a stale cached org id — clear
        // teams until we re-fetch for the preferred org.
        hydrated = {
          ...hydrated,
          currentOrganizationId: preferredOrgId,
          teamMemberships: [],
        };
      }

      setSessionData(hydrated);

      const orgForTeams = hydrated.currentOrganizationId;
      if (user?.id && orgForTeams) {
        // Keep session loading until team memberships match the active org.
        // Otherwise equipment RBAC can short-circuit on a transient [].
        setIsLoading(true);
        void SessionDataService.fetchTeamMemberships(user.id, orgForTeams)
          .then((teamMemberships) => {
            setSessionData((prev) => {
              if (!prev || prev.currentOrganizationId !== orgForTeams) {
                return prev;
              }
              const next: SessionData = {
                ...prev,
                teamMemberships,
                lastUpdated: new Date().toISOString(),
              };
              SessionStorageService.saveSessionToStorage(next);
              return next;
            });
          })
          .finally(() => {
            setIsLoading(false);
            if (result.needsRefresh) {
              void managerRefresh(false);
            }
          });
      } else {
        setIsLoading(false);
        if (result.needsRefresh) {
          Promise.resolve(managerRefresh(false)).finally(() => setIsLoading(false));
        }
      }
    } else {
      Promise.resolve(managerRefresh(true)).finally(() => setIsLoading(false));
    }
  }, [user?.id, authLoading, initializeSession, managerRefresh]);

  return (
    <SessionContext.Provider value={{
      sessionData,
      isLoading,
      error,
      getCurrentOrganization,
      switchOrganization,
      hasTeamRole,
      hasTeamAccess,
      canManageTeam,
      getUserTeamIds,
      refreshSession,
      clearSession
    }}>
      {children}
    </SessionContext.Provider>
  );
};
