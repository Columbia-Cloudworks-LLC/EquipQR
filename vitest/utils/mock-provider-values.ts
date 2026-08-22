import { vi } from 'vitest';
import type { ContextType } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { AuthContext } from '@/contexts/AuthContext';
import { SessionContext } from '@/contexts/SessionContext';
import type {
  SimpleOrganization,
  SimpleOrganizationContextType,
} from '@/contexts/SimpleOrganizationContext';
import type { Role, TeamRole } from '@/types/permissions';
import type { SessionOrganization, SessionTeamMembership } from '@/types/session';
import type { UserPersona } from '@vitest-harness/fixtures/personas';
import { organizations, teams } from '@vitest-harness/fixtures/entities';

type AuthContextValue = NonNullable<ContextType<typeof AuthContext>>;
type SessionContextValue = NonNullable<ContextType<typeof SessionContext>>;

const TEAM_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  Object.values(teams).map((team) => [team.id, team.name]),
);

const toSessionPlan = (plan: string): SessionOrganization['plan'] =>
  plan === 'free' ? 'free' : 'premium';

const toSessionUserRole = (role: Role): SessionOrganization['userRole'] =>
  role === 'viewer' ? 'member' : role;

const toSessionTeamRole = (role: TeamRole): SessionTeamMembership['role'] =>
  role === 'owner' ? 'manager' : role;

const createPersonaSessionOrganization = (persona: UserPersona): SessionOrganization => ({
  id: organizations.acme.id,
  name: organizations.acme.name,
  plan: toSessionPlan(organizations.acme.plan),
  memberCount: organizations.acme.memberCount,
  maxMembers: organizations.acme.maxMembers,
  features: [...organizations.acme.features],
  scanLocationCollectionEnabled: true,
  userRole: toSessionUserRole(persona.organizationRole),
  userStatus: 'active',
});

const createPersonaTeamMemberships = (persona: UserPersona): SessionTeamMembership[] =>
  persona.teamMemberships.map((tm) => ({
    teamId: tm.teamId,
    teamName: TEAM_NAME_BY_ID[tm.teamId] ?? tm.teamId,
    role: toSessionTeamRole(tm.role),
    joinedDate: '2024-01-01T00:00:00Z',
  }));

const createLegacySessionOrganization = (): SessionOrganization => ({
  id: 'org-1',
  name: 'Test Org',
  plan: 'free',
  memberCount: 1,
  maxMembers: 10,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole: 'admin',
  userStatus: 'active',
});

const createMockAuthUser = (persona: UserPersona): User => ({
  id: persona.id,
  email: persona.email,
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: { full_name: persona.name },
});

// ============================================
// Persona-Based Mock Value Creators
// ============================================

/**
 * Create mock session context value based on a user persona
 */
export const createMockSessionForPersona = (persona: UserPersona): SessionContextValue => {
  const currentOrganization = createPersonaSessionOrganization(persona);

  return {
    sessionData: {
      organizations: [currentOrganization],
      teamMemberships: createPersonaTeamMemberships(persona),
      currentOrganizationId: organizations.acme.id,
      lastUpdated: new Date().toISOString(),
      version: 1,
    },
    isLoading: false,
    error: null,
    getCurrentOrganization: () => currentOrganization,
    switchOrganization: () => undefined,
    hasTeamRole: (teamId: string, role: string) => {
      const membership = persona.teamMemberships.find((tm) => tm.teamId === teamId);
      return membership?.role === role;
    },
    hasTeamAccess: (teamId: string) => {
      return persona.teamMemberships.some((tm) => tm.teamId === teamId);
    },
    canManageTeam: (teamId: string) => {
      const membership = persona.teamMemberships.find((tm) => tm.teamId === teamId);
      return (
        membership?.role === 'manager' ||
        persona.organizationRole === 'owner' ||
        persona.organizationRole === 'admin'
      );
    },
    getUserTeamIds: () => persona.teamMemberships.map((tm) => tm.teamId),
    refreshSession: () => Promise.resolve(),
    clearSession: () => {},
  };
};

/**
 * Create mock auth context value based on a user persona
 */
export const createMockAuthForPersona = (persona: UserPersona): AuthContextValue => {
  const user = createMockAuthUser(persona);
  const session: Session = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };

  return {
    user,
    session,
    isLoading: false,
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signInWithGoogle: async () => ({ error: null }),
    signOut: async () => {},
  };
};

/**
 * Create mock simple org value based on a user persona
 */
export const createMockSimpleOrgForPersona = (
  persona: UserPersona,
): SimpleOrganizationContextType => {
  const currentOrganization = createPersonaSessionOrganization(persona);

  return {
    organizations: [currentOrganization],
    userOrganizations: [currentOrganization],
    currentOrganization,
    organizationId: organizations.acme.id,
    setCurrentOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  };
};

// ============================================
// Legacy Mock Values (for backward compatibility)
// ============================================

export const mockSessionContextValue: SessionContextValue = {
  sessionData: {
    organizations: [createLegacySessionOrganization()],
    teamMemberships: [],
    currentOrganizationId: 'org-1',
    lastUpdated: new Date().toISOString(),
    version: 1,
  },
  isLoading: false,
  error: null,
  getCurrentOrganization: () => createLegacySessionOrganization(),
  switchOrganization: () => undefined,
  hasTeamRole: () => false,
  hasTeamAccess: () => false,
  canManageTeam: () => false,
  getUserTeamIds: () => [],
  refreshSession: () => Promise.resolve(),
  clearSession: () => {},
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

const createDefaultSimpleOrg = (
  userRole: SimpleOrganization['userRole'] = 'admin',
): SimpleOrganization => ({
  id: 'org-1',
  name: 'Test Org',
  plan: 'free',
  memberCount: 1,
  maxMembers: 10,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole,
  userStatus: 'active',
});

export const createMockSimpleOrgValue = (
  overrides: SimpleOrgOverrides = {},
): SimpleOrganizationContextType => {
  const defaultOrg = createDefaultSimpleOrg(overrides.userRole);

  return {
    organizations: overrides.organizations || [defaultOrg],
    userOrganizations: overrides.organizations || [defaultOrg],
    currentOrganization: overrides.currentOrganization || defaultOrg,
    organizationId: overrides.organizationId || 'org-1',
    setCurrentOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  };
};

