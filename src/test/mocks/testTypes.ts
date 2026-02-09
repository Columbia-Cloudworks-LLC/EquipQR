/**
 * Test-specific type definitions and mock data factories
 */

import { SessionOrganization } from '@/contexts/SessionContext';
import { User } from '@/contexts/user-context';
import { SimpleOrganization } from '@/contexts/SimpleOrganizationContext';
import { vi } from 'vitest';

// User context type since it's not exported
interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
}

// Simple organization context type since it's not exported  
interface SimpleOrganizationContextType {
  currentOrganization: SimpleOrganization | null;
  organizations: SimpleOrganization[];
  userOrganizations: SimpleOrganization[];
  setCurrentOrganization: (organizationId: string) => void;
  switchOrganization: (organizationId: string) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Test-specific interfaces that match expected mock structures
export interface TestSessionData {
  organizations: SessionOrganization[];
  currentOrganizationId: string | null;
  teamMemberships: Array<{
    teamId: string;
    teamName: string;
    role: 'manager' | 'technician' | 'requestor' | 'viewer';
    joinedDate: string;
  }>;
  lastUpdated: string;
  version: number;
}

export interface TestUser {
  id: string;
  email: string;
  name?: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  plan: 'free' | 'premium';
  memberCount: number;
  maxMembers: number;
  features: string[];
  userStatus: 'active' | 'pending' | 'inactive';
  userRole: 'owner' | 'admin' | 'member';
  members?: Array<{
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    organization_id: string;
  }>;
}

// Mock data factories
export const createMockSessionOrganization = (overrides: Partial<SessionOrganization> = {}): SessionOrganization => ({
  id: 'org-1',
  name: 'Test Organization',
  plan: 'free',
  memberCount: 1,
  maxMembers: 5,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole: 'admin',
  userStatus: 'active',
  ...overrides
});

export const createMockSessionData = (overrides: Partial<TestSessionData> = {}): TestSessionData => ({
  organizations: [createMockSessionOrganization()],
  currentOrganizationId: 'org-1',
  teamMemberships: [],
  lastUpdated: new Date().toISOString(),
  version: 1,
  ...overrides
});

export const createMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides
});

export const createMockUserForContext = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides
});

export const createMockOrganization = (overrides: Partial<TestOrganization> = {}): TestOrganization => ({
  id: 'org-1',
  name: 'Test Organization',
  plan: 'free',
  memberCount: 1,
  maxMembers: 5,
  features: [],
  userStatus: 'active',
  userRole: 'admin',
  members: [
    {
      id: 'user-1',
      email: 'test@example.com',
      role: 'admin',
      organization_id: 'org-1'
    }
  ],
  ...overrides
});

export const createMockUserContext = (user: TestUser | null = null): UserContextType => ({
  currentUser: user ? createMockUserForContext(user) : null,
  isLoading: false,
  setCurrentUser: vi.fn()
});

export const createMockSimpleOrganizationContext = (
  organization: TestOrganization | null = null
): SimpleOrganizationContextType => ({
  currentOrganization: organization as SimpleOrganization | null,
  organizations: organization ? [organization as SimpleOrganization] : [],
  userOrganizations: organization ? [organization as SimpleOrganization] : [],
  setCurrentOrganization: vi.fn(),
  switchOrganization: vi.fn(),
  isLoading: false,
  error: null,
  refetch: vi.fn()
});

// Type-safe mock factories for common test scenarios
export const createAdminTestSetup = () => {
  const user = createMockUser();
  const organization = createMockOrganization({ 
    userRole: 'admin',
    members: [{ ...user, role: 'admin', organization_id: 'org-1' }] 
  });
  const sessionData = createMockSessionData({
    organizations: [createMockSessionOrganization({ userRole: 'admin' })]
  });

  return { user, organization, sessionData };
};

export const createMemberTestSetup = () => {
  const user = createMockUser();
  const organization = createMockOrganization({ 
    userRole: 'member',
    members: [{ ...user, role: 'member', organization_id: 'org-1' }] 
  });
  const sessionData = createMockSessionData({
    organizations: [createMockSessionOrganization({ userRole: 'member' })]
  });

  return { user, organization, sessionData };
};

export const createViewerTestSetup = () => {
  const user = createMockUser();
  const organization = createMockOrganization({ 
    userRole: 'member', // Using member since viewer isn't a valid organization role
    members: [{ ...user, role: 'member', organization_id: 'org-1' }] 
  });
  const sessionData = createMockSessionData({
    organizations: [createMockSessionOrganization({ userRole: 'member' })]
  });

  return { user, organization, sessionData };
};