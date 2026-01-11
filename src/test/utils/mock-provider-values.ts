import { vi } from 'vitest';

import type { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';
import type { UserPersona } from '@/test/fixtures/personas';
import { organizations } from '@/test/fixtures/entities';

// ============================================
// Persona-Based Mock Value Creators
// ============================================

/**
 * Create mock session context value based on a user persona
 */
export const createMockSessionForPersona = (persona: UserPersona) => ({
  sessionData: {
    user: { id: persona.id, email: persona.email },
    organizations: [{
      id: organizations.acme.id,
      name: organizations.acme.name,
      plan: organizations.acme.plan,
      memberCount: organizations.acme.memberCount,
      maxMembers: organizations.acme.maxMembers,
      features: organizations.acme.features,
      billingEmail: persona.email,
      isOwner: persona.organizationRole === 'owner',
      userRole: persona.organizationRole,
      userStatus: 'active' as const
    }],
    teamMemberships: persona.teamMemberships.map(tm => ({
      teamId: tm.teamId,
      role: tm.role,
      userId: persona.id
    })),
    currentOrganization: {
      id: organizations.acme.id,
      name: organizations.acme.name,
      plan: organizations.acme.plan,
      memberCount: organizations.acme.memberCount,
      maxMembers: organizations.acme.maxMembers,
      features: organizations.acme.features,
      billingEmail: persona.email,
      isOwner: persona.organizationRole === 'owner',
      userRole: persona.organizationRole,
      userStatus: 'active' as const
    },
    currentOrganizationId: organizations.acme.id,
    lastUpdated: new Date().toISOString(),
    version: 1
  },
  isLoading: false,
  error: null,
  getCurrentOrganization: () => ({
    id: organizations.acme.id,
    name: organizations.acme.name,
    plan: organizations.acme.plan,
    memberCount: organizations.acme.memberCount,
    maxMembers: organizations.acme.maxMembers,
    features: organizations.acme.features,
    billingEmail: persona.email,
    isOwner: persona.organizationRole === 'owner',
    userRole: persona.organizationRole,
    userStatus: 'active' as const
  }),
  switchOrganization: () => Promise.resolve(),
  hasTeamRole: (teamId: string, role: string) => {
    const membership = persona.teamMemberships.find(tm => tm.teamId === teamId);
    return membership?.role === role;
  },
  hasTeamAccess: (teamId: string) => {
    return persona.teamMemberships.some(tm => tm.teamId === teamId);
  },
  canManageTeam: (teamId: string) => {
    const membership = persona.teamMemberships.find(tm => tm.teamId === teamId);
    return membership?.role === 'manager' || 
           persona.organizationRole === 'owner' || 
           persona.organizationRole === 'admin';
  },
  getUserTeamIds: () => persona.teamMemberships.map(tm => tm.teamId),
  refreshSession: () => Promise.resolve(),
  clearSession: () => {}
});

/**
 * Create mock auth context value based on a user persona
 */
export const createMockAuthForPersona = (persona: UserPersona) => ({
  user: {
    id: persona.id,
    email: persona.email,
    user_metadata: { full_name: persona.name }
  },
  session: {
    user: { id: persona.id, email: persona.email },
    access_token: 'mock-token',
    expires_at: Date.now() + 3600000
  },
  isLoading: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

/**
 * Create mock simple org value based on a user persona
 */
export const createMockSimpleOrgForPersona = (persona: UserPersona) => ({
  organizations: [{
    id: organizations.acme.id,
    name: organizations.acme.name,
    plan: organizations.acme.plan,
    memberCount: organizations.acme.memberCount,
    maxMembers: organizations.acme.maxMembers,
    features: organizations.acme.features,
    userRole: persona.organizationRole,
    userStatus: 'active' as const,
  }],
  userOrganizations: [{
    id: organizations.acme.id,
    name: organizations.acme.name,
    plan: organizations.acme.plan,
    memberCount: organizations.acme.memberCount,
    maxMembers: organizations.acme.maxMembers,
    features: organizations.acme.features,
    userRole: persona.organizationRole,
    userStatus: 'active' as const,
  }],
  currentOrganization: {
    id: organizations.acme.id,
    name: organizations.acme.name,
    plan: organizations.acme.plan,
    memberCount: organizations.acme.memberCount,
    maxMembers: organizations.acme.maxMembers,
    features: organizations.acme.features,
    userRole: persona.organizationRole,
    userStatus: 'active' as const,
  },
  organizationId: organizations.acme.id,
  setCurrentOrganization: vi.fn(),
  switchOrganization: vi.fn(),
  isLoading: false,
  error: null,
  refetch: vi.fn().mockResolvedValue(undefined),
});

// ============================================
// Legacy Mock Values (for backward compatibility)
// ============================================

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

