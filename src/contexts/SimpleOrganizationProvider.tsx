import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';
import { 
  SimpleOrganizationContext, 
  SimpleOrganization, 
  SimpleOrganizationContextType 
} from './SimpleOrganizationContext';

const CURRENT_ORG_STORAGE_KEY = 'equipqr_current_organization';

export const SimpleOrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [syncWarningCount, setSyncWarningCount] = useState(0);
  
  // Get session context to keep them synchronized
  const sessionContext = useSession();

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
      if (stored) {
        setCurrentOrganizationId(stored);
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

      // Fetching organizations for user

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
        // No organization memberships found
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

      // Combine data
      const orgs: SimpleOrganization[] = (orgData || []).map(org => {
        const membership = membershipData.find(m => m.organization_id === org.id);
        return {
          id: org.id,
          name: org.name,
          plan: org.plan as 'free' | 'premium',
          memberCount: org.member_count,
          maxMembers: org.max_members,
          features: org.features,
          billingCycle: org.billing_cycle as 'monthly' | 'yearly' | undefined,
          nextBillingDate: org.next_billing_date || undefined,
          logo: org.logo || undefined,
          backgroundColor: org.background_color || undefined,
          userRole: membership?.role as 'owner' | 'admin' | 'member' || 'member',
          userStatus: membership?.status as 'active' | 'pending' | 'inactive' || 'active'
        };
      });

      // Organizations fetched successfully
      return orgs;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Helper function to prioritize organizations by user role
  const getPrioritizedOrganization = useCallback((orgs: SimpleOrganization[]): string => {
    if (orgs.length === 0) return '';
    
    // Sort by role priority: owner > admin > member
    const prioritized = [...orgs].sort((a, b) => {
      const roleWeight = { owner: 3, admin: 2, member: 1 };
      return (roleWeight[b.userRole] || 0) - (roleWeight[a.userRole] || 0);
    });
    
    return prioritized[0].id;
  }, []);

  // Synchronization monitoring and recovery
  const syncWithSession = useCallback(() => {
    if (!sessionContext?.sessionData?.currentOrganizationId || !currentOrganizationId) {
      return; // Don't sync if either context is not ready
    }

    const sessionOrgId = sessionContext.sessionData.currentOrganizationId;
    
    if (sessionOrgId !== currentOrganizationId) {
      setSyncWarningCount(prev => prev + 1);
      // Sync mismatch detected between contexts

      // Auto-recover after a few warnings by syncing to session context
      if (syncWarningCount >= 2) {
        // Auto-recovering sync with session
        setCurrentOrganizationId(sessionOrgId);
        try {
          localStorage.setItem(CURRENT_ORG_STORAGE_KEY, sessionOrgId);
        } catch (error) {
          logger.warn('Failed to save synced organization to storage', error);
        }
        setSyncWarningCount(0);
      }
    } else if (syncWarningCount > 0) {
      // Reset warning count when sync is restored
      setSyncWarningCount(0);
    }
  }, [sessionContext, currentOrganizationId, syncWarningCount]);

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
          localStorage.setItem(CURRENT_ORG_STORAGE_KEY, sessionOrgId);
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
        localStorage.setItem(CURRENT_ORG_STORAGE_KEY, prioritizedOrgId);
      } catch (error) {
        logger.warn('Failed to save current organization to storage', error);
      }
    }
  }, [currentOrganizationId, organizations, getPrioritizedOrganization, sessionContext]);

  // Monitor synchronization with session context
  useEffect(() => {
    syncWithSession();
  }, [syncWithSession]);

  // Validate current organization exists in user's organizations
  useEffect(() => {
    if (currentOrganizationId && organizations.length > 0) {
      const orgExists = organizations.some(org => org.id === currentOrganizationId);
      if (!orgExists) {
        logger.warn('SimpleOrganizationProvider: Current organization not found in user organizations, resetting');
        const prioritizedOrgId = getPrioritizedOrganization(organizations);
        // Resetting to prioritized organization
        setCurrentOrganizationId(prioritizedOrgId);
        try {
          localStorage.setItem(CURRENT_ORG_STORAGE_KEY, prioritizedOrgId);
        } catch (error) {
          logger.warn('Failed to save current organization to storage', error);
        }
      }
    }
  }, [currentOrganizationId, organizations, getPrioritizedOrganization]);

  const setCurrentOrganization = useCallback((organizationId: string) => {
    // Setting current organization
    setCurrentOrganizationId(organizationId);
    try {
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, organizationId);
    } catch (error) {
      logger.warn('Failed to save current organization to storage', error);
    }
  }, []);

  const switchOrganization = useCallback((organizationId: string) => {
    // Switch organization called
    setCurrentOrganization(organizationId);
    // Also update session context to keep them synchronized
    if (sessionContext?.switchOrganization) {
      sessionContext.switchOrganization(organizationId);
    }
  }, [setCurrentOrganization, sessionContext]);

  const currentOrganization = currentOrganizationId 
    ? organizations.find(org => org.id === currentOrganizationId) || null
    : null;

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


