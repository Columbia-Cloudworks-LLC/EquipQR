import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { setActivePersistenceScope } from '@/lib/queryPersistence';
import { mapOrganizationRowsToSessionOrganizations } from '@/utils/mapOrganizationToSession';
import {
  mergeAllowedOrganizationIds,
  resolveValidatedOrganizationId,
} from '@/utils/trustedOrganizationScope';
import { getPrioritizedOrganizationId } from '@/utils/prioritizeOrganizations';
import { DASHBOARD_CURRENT_ORG_STORAGE_KEY } from '@/utils/organizationSelection';
import { setPreferenceLocalStorage } from '@/lib/cookieConsent';
import {
  SimpleOrganizationContext,
  SimpleOrganization,
  SimpleOrganizationContextType,
} from './SimpleOrganizationContext';

export const SimpleOrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY)
        ?? localStorage.getItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const lastMismatchSyncAttemptRef = useRef<string | null>(null);
  
  // Get session context to keep them synchronized
  const sessionContext = useSession();

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY)
        ?? localStorage.getItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY);
      if (stored) {
        setCurrentOrganizationId(stored);
        // The QR hint is single-use; do not retain navigation state.
        sessionStorage.removeItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY);
      }
    } catch (error) {
      logger.warn('Failed to load current organization from storage', error);
    }
  }, []);

  // Fetch organizations using React Query
  const {
    data: organizations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['simple-organizations', user?.id],
    queryFn: async (): Promise<SimpleOrganization[]> => {
      if (!user) return [];

      // Fast path: SessionProvider already fetched organization_members +
      // organizations during auth. Reuse that data and skip both round-trips;
      // only the single-row personal_organizations query is still needed to
      // compute the isPersonal flag (SessionOrganization does not carry it).
      const sessionOrgs = sessionContext.sessionData?.organizations;
      if (sessionOrgs && sessionOrgs.length > 0) {
        const { data: personalOrgData } = await supabase
          .from('personal_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();
        const personalOrgId = personalOrgData?.organization_id || null;

        return sessionOrgs.map(org => ({
          ...org,
          isPersonal: org.id === personalOrgId,
        }));
      }

      // Fallback: session context not yet resolved — do the full fetch so the
      // UI never blocks on a session timing race.

      // Get user's organization memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) {
        logger.error('SimpleOrganizationProvider: Error fetching memberships', membershipError);
        throw membershipError;
      }

      if (!membershipData || membershipData.length === 0) {
        return [];
      }

      // Get organization details
      const orgIds = membershipData.map(m => m.organization_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgError) {
        logger.error('SimpleOrganizationProvider: Error fetching organizations', orgError);
        throw orgError;
      }

      // Get user's personal organization ID
      const { data: personalOrgData } = await supabase
        .from('personal_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const personalOrgId = personalOrgData?.organization_id || null;

      return mapOrganizationRowsToSessionOrganizations(orgData || [], membershipData).map(org => ({
        ...org,
        isPersonal: org.id === personalOrgId,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  const getPrioritizedOrganization = useCallback(
    (orgs: SimpleOrganization[]): string => getPrioritizedOrganizationId(orgs),
    [],
  );

  // Synchronization monitoring and recovery — session org is authoritative when it diverges
  // from equipqr_current_organization (e.g. QR redirect switched session without updating this key).
  const syncWithSession = useCallback(() => {
    if (!sessionContext?.sessionData?.currentOrganizationId || !currentOrganizationId) {
      return;
    }

    const sessionOrgId = sessionContext.sessionData.currentOrganizationId;

    if (sessionOrgId === currentOrganizationId) {
      lastMismatchSyncAttemptRef.current = null;
      return;
    }

    if (organizations.length === 0) {
      return;
    }

    const sessionOrgKnown = organizations.some(org => org.id === sessionOrgId);
    if (!sessionOrgKnown) {
      return;
    }

    const syncAttemptKey = `follow-session:${sessionOrgId}`;
    if (lastMismatchSyncAttemptRef.current === syncAttemptKey) {
      return;
    }

    lastMismatchSyncAttemptRef.current = syncAttemptKey;
    setCurrentOrganizationId(sessionOrgId);
    try {
      setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, sessionOrgId);
    } catch (error) {
      logger.warn('Failed to save current organization to storage', error);
      lastMismatchSyncAttemptRef.current = null;
    }
  }, [sessionContext, currentOrganizationId, organizations]);

  // Auto-select prioritized organization if none selected and organizations are available
  useEffect(() => {
    if (!currentOrganizationId && organizations.length > 0) {
      // Wait for session context to be ready before auto-selecting
      if (sessionContext?.isLoading) {
        // Waiting for session context to load
        return;
      }

      const sessionOrgId = sessionContext?.sessionData?.currentOrganizationId;
      
      // If session has an org and it exists in our organizations, use it
      if (sessionOrgId && organizations.find(org => org.id === sessionOrgId)) {
        // Syncing with session organization
        setCurrentOrganizationId(sessionOrgId);
        try {
          setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, sessionOrgId);
        } catch (error) {
          logger.warn('Failed to save current organization to storage', error);
        }
        return;
      }

      // Otherwise, use role-based prioritization
      const prioritizedOrgId = getPrioritizedOrganization(organizations);
      // Auto-selecting prioritized organization
      setCurrentOrganizationId(prioritizedOrgId);
      try {
        setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, prioritizedOrgId);
      } catch (error) {
        logger.warn('Failed to save current organization to storage', error);
      }
    }
  }, [currentOrganizationId, organizations, getPrioritizedOrganization, sessionContext]);

  // Monitor synchronization with session context
  useEffect(() => {
    syncWithSession();
  }, [syncWithSession]);

  // Validate current organization exists in user's organizations and reset if not
  useEffect(() => {
    if (currentOrganizationId && organizations.length > 0) {
      const orgExists = organizations.some(org => org.id === currentOrganizationId);
      if (!orgExists) {
        logger.warn('SimpleOrganizationProvider: Current organization not found in user organizations, resetting');
        const prioritizedOrgId = getPrioritizedOrganization(organizations);
        setCurrentOrganizationId(prioritizedOrgId);
        try {
          setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, prioritizedOrgId);
        } catch (error) {
          logger.warn('Failed to save current organization to storage', error);
        }
      }
    }
  }, [currentOrganizationId, organizations, getPrioritizedOrganization]);

  const setCurrentOrganization = useCallback((organizationId: string) => {
    setCurrentOrganizationId(organizationId);
    try {
      setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, organizationId);
    } catch (error) {
      logger.warn('Failed to save current organization to storage', error);
    }
  }, []);

  const switchOrganization = useCallback((organizationId: string) => {
    setCurrentOrganization(organizationId);
    // Also update session context to keep them synchronized
    if (sessionContext?.switchOrganization) {
      sessionContext.switchOrganization(organizationId);
    }
  }, [setCurrentOrganization, sessionContext]);

  // Derive currentOrganization from currentOrganizationId + organizations
  // instead of storing it in separate state (avoids extra renders and state drift)
  const currentOrganization = useMemo(
    () => currentOrganizationId
      ? organizations.find(org => org.id === currentOrganizationId) ?? null
      : null,
    [currentOrganizationId, organizations]
  );

  // Announce the active <user, org> scope to the TanStack Query persistence
  // layer. The persister namespaces IndexedDB keys by scope so two users on
  // the same device never read each other's cached PM/equipment/work-order
  // data. When the user signs out or no org is selected, scope is cleared
  // and the persister becomes a no-op until a real scope reappears.
  useEffect(() => {
    const allowedOrgIds = mergeAllowedOrganizationIds(
      organizations.map((org) => org.id),
      sessionContext?.sessionData?.organizations?.map((org) => org.id) ?? [],
    );
    const scopedOrgId = resolveValidatedOrganizationId({
      currentOrganizationId: currentOrganization?.id,
      sessionOrganizationId: sessionContext?.sessionData?.currentOrganizationId,
      persistedOrganizationId: currentOrganizationId,
      allowedOrganizationIds: allowedOrgIds,
    });
    if (user?.id && scopedOrgId) {
      setActivePersistenceScope({ userId: user.id, orgId: scopedOrgId });
    } else {
      setActivePersistenceScope(null);
    }
  }, [
    user?.id,
    currentOrganization?.id,
    currentOrganizationId,
    organizations,
    sessionContext?.sessionData?.currentOrganizationId,
    sessionContext?.sessionData?.organizations,
  ]);

  // Monitor state changes for debugging (removed excessive logging)

  const refetchData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const contextValue: SimpleOrganizationContextType = {
    organizations,
    userOrganizations: organizations, // Backward compatibility alias
    currentOrganization,
    organizationId: currentOrganizationId,
    setCurrentOrganization,
    switchOrganization,
    isLoading,
    error: error?.message || null,
    refetch: refetchData
  };

  return (
    <SimpleOrganizationContext.Provider value={contextValue}>
      {children}
    </SimpleOrganizationContext.Provider>
  );
};


