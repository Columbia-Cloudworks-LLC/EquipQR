import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { SessionData, SessionTeamMembership, SessionOrganization } from '@/contexts/SessionContext';
import { SessionDataService } from '@/services/sessionDataService';
import { SessionStorageService } from '@/services/sessionStorageService';
import { getOrganizationPreference, saveOrganizationPreference, shouldRefreshSession, getSessionVersion } from '@/utils/sessionPersistence';
import { logger } from '@/utils/logger';

interface UseSessionManagerProps {
  user: User | null;
  onSessionUpdate: (data: SessionData) => void;
  onError: (error: string) => void;
}

export const useSessionManager = ({ user, onSessionUpdate, onError }: UseSessionManagerProps) => {
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);

  const createSessionData = useCallback((
    organizations: SessionOrganization[],
    currentOrganizationId: string | null,
    teamMemberships: SessionTeamMembership[]
  ): SessionData => {
    return {
      organizations,
      currentOrganizationId,
      teamMemberships,
      lastUpdated: new Date().toISOString(),
      version: getSessionVersion()
    };
  }, []);

  const refreshSession = useCallback(async (force: boolean = false, preserveOrgSelection: boolean = false) => {
    if (!user) {
      onSessionUpdate({
        organizations: [],
        currentOrganizationId: null,
        teamMemberships: [],
        lastUpdated: new Date().toISOString(),
        version: getSessionVersion()
      });
      return;
    }

    // More conservative refresh timing to prevent unnecessary API calls
    if (!force && lastRefreshTime) {
      const lastRefresh = new Date(lastRefreshTime);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (lastRefresh > fiveMinutesAgo) {
        return;
      }
    }

    try {
      onError('');
      
      const userPreference = getOrganizationPreference();
      const storedData = SessionStorageService.loadSessionFromStorage();
      
      // If preserving org selection, prioritize current selection over stored data
      const prioritizedOrgId = preserveOrgSelection && storedData?.currentOrganizationId 
        ? storedData.currentOrganizationId 
        : userPreference?.selectedOrgId;

      const { organizations, currentOrganizationId, teamMemberships } = 
        await SessionDataService.fetchSessionData(
          user.id,
          prioritizedOrgId,
          storedData?.currentOrganizationId
        );

      const newSessionData = createSessionData(organizations, currentOrganizationId, teamMemberships);
      
      onSessionUpdate(newSessionData);
      SessionStorageService.saveSessionToStorage(newSessionData);
      setLastRefreshTime(new Date().toISOString());
    } catch (err) {
      console.error('Error refreshing session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh session';
      onError(errorMessage);
      
      // Try to use cached data if available and compatible
      if (!force) {
        const cachedData = SessionStorageService.loadSessionFromStorage();
        if (cachedData && SessionStorageService.isSessionVersionValid(cachedData)) {
          onSessionUpdate(cachedData);
        }
      }
    }
  }, [user, lastRefreshTime, onSessionUpdate, onError, createSessionData]);

  const switchOrganization = useCallback(async (
    organizationId: string,
    sessionData: SessionData | null
  ) => {
    if (!sessionData || !user) return;
    
    const organization = sessionData.organizations.find(org => org.id === organizationId);
    if (!organization) {
      logger.warn('Organization not found during session switch', { organizationId });
      throw new Error(`Organization ${organizationId} not found in user's organizations`);
    }
    
    // Save user preference immediately
    saveOrganizationPreference(organizationId);
    
    try {
      // Fetch team memberships for the new organization
      const teamMemberships = await SessionDataService.fetchTeamMemberships(user.id, organizationId);

      const updatedSessionData = createSessionData(
        sessionData.organizations,
        organizationId,
        teamMemberships
      );

      onSessionUpdate(updatedSessionData);
      SessionStorageService.saveSessionToStorage(updatedSessionData);
    } catch (error) {
      logger.error('Error switching organization', error);
    }
  }, [user, onSessionUpdate, createSessionData]);

  const shouldRefreshOnVisibility = useCallback((isVisible: boolean): boolean => {
    if (!isVisible || !user || !lastRefreshTime) return false;
    
    const lastRefresh = new Date(lastRefreshTime);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    return lastRefresh < thirtyMinutesAgo;
  }, [user, lastRefreshTime]);

  const initializeSession = useCallback(() => {
    if (!user) {
      SessionStorageService.clearSessionStorage();
      return { shouldLoadFromCache: false, cachedData: null };
    }

    // Try to load from cache first
    const cachedData = SessionStorageService.loadSessionFromStorage();
    if (cachedData && SessionStorageService.isSessionVersionValid(cachedData)) {
      const needsRefresh = shouldRefreshSession(cachedData.lastUpdated);
      return { shouldLoadFromCache: true, cachedData, needsRefresh };
    }
    
    return { shouldLoadFromCache: false, cachedData: null };
  }, [user]);

  return {
    refreshSession,
    switchOrganization,
    shouldRefreshOnVisibility,
    initializeSession
  };
};