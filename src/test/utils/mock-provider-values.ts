import { vi } from 'vitest';

import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';

export const mockSessionContextValue = {
  sessionData: {
    user: { id: 'user-1', email: 'test@example.com' },
    organizations: [{
      id: 'org-1',
      name: 'Test Org',
      plan: 'free' as const,
      memberCount: 1,
      maxMembers: 10,
      features: [],
      billingEmail: 'test@example.com',
      isOwner: true,
      userRole: 'admin' as const,
      userStatus: 'active' as const
    }],
    teamMemberships: [],
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      plan: 'free' as const,
      memberCount: 1,
      maxMembers: 10,
      features: [],
      billingEmail: 'test@example.com',
      isOwner: true,
      userRole: 'admin' as const,
      userStatus: 'active' as const
    },
    currentOrganizationId: 'org-1',
    lastUpdated: new Date().toISOString(),
    version: 1
  },
  isLoading: false,
  error: null,
  getCurrentOrganization: () => ({
    id: 'org-1',
    name: 'Test Org',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 10,
    features: [],
    billingEmail: 'test@example.com',
    isOwner: true,
    userRole: 'admin' as const,
    userStatus: 'active' as const
  }),
  switchOrganization: () => Promise.resolve(),
  hasTeamRole: () => false,
  hasTeamAccess: () => false,
  canManageTeam: () => false,
  getUserTeamIds: () => [],
  refreshSession: () => Promise.resolve(),
  clearSession: () => {}
};

export const mockAuthContextValue = {
  user: null,
  session: null,
  isLoading: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
};

export type SimpleOrgOverrides = Partial<{
  currentOrganization: SimpleOrganization | null;
  organizations: SimpleOrganization[];
  organizationId: string | null;
  userRole: 'owner' | 'admin' | 'member';
}>;

export const createMockSimpleOrgValue = (
  overrides: SimpleOrgOverrides = {}
) => ({
  organizations: overrides?.organizations || [{
    id: 'org-1',
    name: 'Test Org',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 10,
    features: [],
    userRole: overrides?.userRole || 'admin',
    userStatus: 'active' as const,
  }],
  userOrganizations: overrides?.organizations || [{
    id: 'org-1',
    name: 'Test Org',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 10,
    features: [],
    userRole: overrides?.userRole || 'admin',
    userStatus: 'active' as const,
  }],
  currentOrganization: overrides?.currentOrganization || {
    id: 'org-1',
    name: 'Test Org',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 10,
    features: [],
    userRole: overrides?.userRole || 'admin',
    userStatus: 'active' as const,
  },
  organizationId: overrides?.organizationId || 'org-1',
  setCurrentOrganization: vi.fn(),
  switchOrganization: vi.fn(),
  isLoading: false,
  error: null,
  refetch: vi.fn().mockResolvedValue(undefined),
});

