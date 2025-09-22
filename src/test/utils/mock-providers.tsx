// Mock providers file to avoid react-refresh warnings
import React from 'react';
import { SessionContext } from '@/contexts/SessionContext';
import { AuthContext } from '@/contexts/AuthContext';

// Mock SessionContext value
const mockSessionContextValue = {
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

// Mock AuthContext value
const mockAuthContextValue = {
  user: null, // Use null to match Supabase User type
  session: null,
  isLoading: false,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
};

export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={mockAuthContextValue}>
    <div data-testid="mock-auth-provider">{children}</div>
  </AuthContext.Provider>
);

export const MockSessionProvider = ({ children }: { children: React.ReactNode }) => (
  <SessionContext.Provider value={mockSessionContextValue}>
    <div data-testid="mock-session-provider">{children}</div>
  </SessionContext.Provider>
);

export const MockUserProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-user-provider">{children}</div>
);

// Create a factory for customizable organization mock values
export const createMockSimpleOrgValue = (overrides?: Partial<{
  currentOrganization: any;
  organizations: any[];
  organizationId: string | null;
  userRole: 'owner' | 'admin' | 'member';
}>) => ({
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

// Import the context to provide proper mock
import { SimpleOrganizationContext } from '@/contexts/SimpleOrganizationContext';

export const MockSimpleOrganizationProvider = ({ 
  children, 
  value 
}: { 
  children: React.ReactNode;
  value?: ReturnType<typeof createMockSimpleOrgValue>;
}) => (
  <SimpleOrganizationContext.Provider value={value ?? createMockSimpleOrgValue()}>
    <div data-testid="mock-organization-provider">{children}</div>
  </SimpleOrganizationContext.Provider>
);

export const MockSessionProvider2 = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="mock-session-provider-2">{children}</div>
);