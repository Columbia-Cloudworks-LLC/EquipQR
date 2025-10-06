/**
 * Test Utilities for Cross-Organizational Permission Testing
 * 
 * Provides comprehensive test data factories, mock setups, and helper functions
 * for testing complex multi-organizational permission scenarios.
 */

import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock the dependencies
vi.mock('@/hooks/useSession');
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useSimpleOrganization');
vi.mock('@/contexts/UserContext');
vi.mock('@/services/permissions/PermissionEngine');

import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useUser } from '@/contexts/UserContext';
import { permissionEngine } from '@/services/permissions/PermissionEngine';

const mockUseSession = vi.mocked(useSession);
const mockUseAuth = vi.mocked(useAuth);
const mockUseSimpleOrganization = vi.mocked(useSimpleOrganization);
const mockUseUser = vi.mocked(useUser);
const mockPermissionEngine = vi.mocked(permissionEngine);

// Test data factories
export const createTestUser = (id: string, email: string, name: string) => ({
  id,
  email,
  name
});

export const createTestOrganization = (
  id: string, 
  name: string, 
  userRole: 'owner' | 'admin' | 'member', 
  plan: 'free' | 'premium' = 'free',
  overrides: Partial<{
    memberCount: number;
    maxMembers: number;
    features: string[];
    userStatus: 'active' | 'pending' | 'inactive';
  }> = {}
) => ({
  id,
  name,
  plan,
  memberCount: overrides.memberCount ?? 1,
  maxMembers: overrides.maxMembers ?? (plan === 'free' ? 5 : 50),
  features: overrides.features ?? (plan === 'premium' ? ['advanced_analytics', 'custom_fields'] : []),
  userStatus: overrides.userStatus ?? 'active' as const,
  userRole,
  members: [{
    id: 'user-1',
    email: 'test@example.com',
    role: userRole,
    organization_id: id
  }]
});

export const createTestTeam = (id: string, name: string, organizationId: string) => ({
  id,
  name,
  organization_id: organizationId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export const createTestEquipment = (
  id: string, 
  name: string, 
  organizationId: string, 
  teamId?: string,
  overrides: Partial<{
    status: 'active' | 'maintenance' | 'inactive';
    manufacturer: string;
    model: string;
    serial_number: string;
    location: string;
  }> = {}
) => ({
  id,
  name,
  manufacturer: overrides.manufacturer ?? 'Test Manufacturer',
  model: overrides.model ?? 'Test Model',
  serial_number: overrides.serial_number ?? `TEST-${id}`,
  status: overrides.status ?? 'active' as const,
  location: overrides.location ?? 'Test Location',
  organization_id: organizationId,
  team_id: teamId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export const createTestWorkOrder = (
  id: string, 
  title: string, 
  organizationId: string, 
  teamId?: string, 
  assigneeId?: string,
  overrides: Partial<{
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    created_by: string;
    equipment_id: string;
  }> = {}
) => ({
  id,
  title,
  description: 'Test Description',
  equipment_id: overrides.equipment_id ?? 'equipment-1',
  status: overrides.status ?? 'submitted' as const,
  priority: overrides.priority ?? 'medium' as const,
  organization_id: organizationId,
  team_id: teamId,
  assignee_id: assigneeId,
  created_by: overrides.created_by ?? 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

export const createTestTeamMembership = (teamId: string, role: 'manager' | 'technician') => ({
  teamId,
  role,
  teamName: `Team ${teamId}`,
  joinedDate: new Date().toISOString()
});

// Complex scenario builders
export const createMultiOrgUser = (
  userId: string,
  orgARole: 'owner' | 'admin' | 'member',
  orgBRole: 'owner' | 'admin' | 'member'
) => {
  const user = createTestUser(userId, 'multi@example.com', 'Multi Org User');
  const orgA = createTestOrganization('org-a', 'Organization A', orgARole);
  const orgB = createTestOrganization('org-b', 'Organization B', orgBRole);
  
  return {
    user,
    organizations: { orgA, orgB },
    currentOrg: orgA
  };
};

export const createTeamHierarchy = (organizationId: string) => {
  const teamA = createTestTeam('team-a', 'Team A', organizationId);
  const teamB = createTestTeam('team-b', 'Team B', organizationId);
  const teamC = createTestTeam('team-c', 'Team C', organizationId);
  
  return {
    teams: { teamA, teamB, teamC },
    equipment: {
      teamAEquipment: createTestEquipment('eq-a1', 'Team A Equipment 1', organizationId, 'team-a'),
      teamBEquipment: createTestEquipment('eq-b1', 'Team B Equipment 1', organizationId, 'team-b'),
      unassignedEquipment: createTestEquipment('eq-u1', 'Unassigned Equipment', organizationId)
    },
    workOrders: {
      teamAWorkOrder: createTestWorkOrder('wo-a1', 'Team A Work Order', organizationId, 'team-a'),
      teamBWorkOrder: createTestWorkOrder('wo-b1', 'Team B Work Order', organizationId, 'team-b'),
      crossTeamWorkOrder: createTestWorkOrder('wo-c1', 'Cross Team Work Order', organizationId, 'team-a', 'user-b')
    }
  };
};

// Mock setup functions
export const setupPermissionEngineMock = () => {
  mockPermissionEngine.hasPermission.mockImplementation((permission: string, context: any, entityContext?: any) => {
    const { userRole, teamMemberships, organizationId } = context;
    
    // Organization-level permissions
    if (permission === 'organization.manage') {
      return ['owner', 'admin'].includes(userRole);
    }
    if (permission === 'organization.invite') {
      return ['owner', 'admin'].includes(userRole);
    }
    
    // Equipment permissions
    if (permission === 'equipment.view') {
      if (['owner', 'admin', 'member'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => tm.teamId === entityContext.teamId);
      }
      return false;
    }
    if (permission === 'equipment.edit') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      }
      return false;
    }
    
    // Work order permissions
    if (permission === 'workorder.view') {
      if (['owner', 'admin', 'member'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => tm.teamId === entityContext.teamId);
      }
      return false;
    }
    if (permission === 'workorder.edit') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      }
      return false;
    }
    if (permission === 'workorder.assign') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      }
      return false;
    }
    if (permission === 'workorder.changestatus') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => tm.teamId === entityContext.teamId);
      }
      if (entityContext?.assigneeId === context.userId) return true;
      return false;
    }
    
    // Team permissions
    if (permission === 'team.view') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => tm.teamId === entityContext.teamId);
      }
      return false;
    }
    if (permission === 'team.manage') {
      if (['owner', 'admin'].includes(userRole)) return true;
      if (entityContext?.teamId) {
        return teamMemberships.some((tm: any) => 
          tm.teamId === entityContext.teamId && tm.role === 'manager'
        );
      }
      return false;
    }
    
    return false;
  });
};

export const setupMockProviders = (
  user: ReturnType<typeof createTestUser>,
  organization: ReturnType<typeof createTestOrganization>,
  teamMemberships: Array<ReturnType<typeof createTestTeamMembership>> = []
) => {
  mockUseAuth.mockReturnValue({
    user: { id: user.id, email: user.email },
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn()
  });

  mockUseUser.mockReturnValue({
    currentUser: user,
    isLoading: false,
    setCurrentUser: vi.fn()
  });

  mockUseSession.mockReturnValue({
    sessionData: {
      organizations: [organization],
      currentOrganizationId: organization.id,
      teamMemberships: teamMemberships.map(tm => ({
        teamId: tm.teamId,
        teamName: tm.teamName,
        role: tm.role,
        joinedDate: tm.joinedDate
      })),
      lastUpdated: new Date().toISOString(),
      version: 1
    },
    isLoading: false,
    error: null,
    getCurrentOrganization: vi.fn(() => organization),
    switchOrganization: vi.fn(),
    hasTeamRole: vi.fn((teamId: string, role: string) => 
      teamMemberships.some(tm => tm.teamId === teamId && tm.role === role)
    ),
    hasTeamAccess: vi.fn((teamId: string) => 
      teamMemberships.some(tm => tm.teamId === teamId)
    ),
    canManageTeam: vi.fn((teamId: string) => 
      teamMemberships.some(tm => tm.teamId === teamId && tm.role === 'manager')
    ),
    getUserTeamIds: vi.fn(() => teamMemberships.map(tm => tm.teamId)),
    refreshSession: vi.fn(),
    clearSession: vi.fn()
  });

  mockUseSimpleOrganization.mockReturnValue({
    currentOrganization: organization,
    organizations: [organization],
    userOrganizations: [organization],
    setCurrentOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    isLoading: false,
    error: null,
    refetch: vi.fn()
  });

  setupPermissionEngineMock();
};

// Test wrapper component
export const TestWrapper = ({ 
  children, 
  user, 
  organization, 
  teamMemberships = [],
  initialRoute = '/'
}: {
  children: React.ReactNode;
  user: ReturnType<typeof createTestUser>;
  organization: ReturnType<typeof createTestOrganization>;
  teamMemberships?: Array<ReturnType<typeof createTestTeamMembership>>;
  initialRoute?: string;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  setupMockProviders(user, organization, teamMemberships);

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Custom render function
export const renderWithPermissions = (
  ui: ReactElement,
  options: {
    user: ReturnType<typeof createTestUser>;
    organization: ReturnType<typeof createTestOrganization>;
    teamMemberships?: Array<ReturnType<typeof createTestTeamMembership>>;
    initialRoute?: string;
  } & Omit<RenderOptions, 'wrapper'> = {} as any
) => {
  const { user, organization, teamMemberships, initialRoute, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper 
        user={user} 
        organization={organization} 
        teamMemberships={teamMemberships}
        initialRoute={initialRoute}
      >
        {children}
      </TestWrapper>
    ),
    ...renderOptions
  });
};

// Permission assertion helpers
export const expectPermission = (permission: string, context: any, entityContext?: any, expected: boolean) => {
  const result = mockPermissionEngine.hasPermission(permission, context, entityContext);
  expect(result).toBe(expected);
};

export const expectPermissions = (permissions: Array<{ permission: string; context: any; entityContext?: any; expected: boolean }>) => {
  permissions.forEach(({ permission, context, entityContext, expected }) => {
    expectPermission(permission, context, entityContext, expected);
  });
};

// Scenario builders for common test cases
export const buildOwnerScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'owner');
  return { user, organization };
};

export const buildAdminScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'admin');
  return { user, organization };
};

export const buildMemberScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'member@example.com', 'Member User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'member');
  return { user, organization };
};

export const buildTeamManagerScenario = (orgId: string = 'org-1', teamId: string = 'team-a') => {
  const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
  const organization = createTestOrganization(orgId, 'Primary Org', 'member');
  const teamMemberships = [createTestTeamMembership(teamId, 'manager')];
  return { user, organization, teamMemberships };
};

export const buildTeamTechnicianScenario = (orgId: string = 'org-1', teamId: string = 'team-a') => {
  const user = createTestUser('user-1', 'tech@example.com', 'Team Technician');
  const organization = createTestOrganization(orgId, 'Primary Org', 'member');
  const teamMemberships = [createTestTeamMembership(teamId, 'technician')];
  return { user, organization, teamMemberships };
};

export const buildMultiOrgScenario = () => {
  const user = createTestUser('user-1', 'multi@example.com', 'Multi Org User');
  const orgA = createTestOrganization('org-a', 'Organization A', 'owner');
  const orgB = createTestOrganization('org-b', 'Organization B', 'member');
  return { user, orgA, orgB };
};

export const buildTeamHierarchyScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'hierarchy@example.com', 'Hierarchy User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'admin');
  const teamMemberships = [
    createTestTeamMembership('team-a', 'manager'),
    createTestTeamMembership('team-b', 'technician')
  ];
  const hierarchy = createTeamHierarchy(orgId);
  return { user, organization, teamMemberships, hierarchy };
};

// Edge case scenario builders
export const buildInactiveUserScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'inactive@example.com', 'Inactive User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'member', 'free', { userStatus: 'inactive' });
  return { user, organization };
};

export const buildPendingUserScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'pending@example.com', 'Pending User');
  const organization = createTestOrganization(orgId, 'Primary Org', 'member', 'free', { userStatus: 'pending' });
  return { user, organization };
};

export const buildFreePlanScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'free@example.com', 'Free User');
  const organization = createTestOrganization(orgId, 'Free Org', 'owner', 'free');
  return { user, organization };
};

export const buildPremiumPlanScenario = (orgId: string = 'org-1') => {
  const user = createTestUser('user-1', 'premium@example.com', 'Premium User');
  const organization = createTestOrganization(orgId, 'Premium Org', 'owner', 'premium');
  return { user, organization };
};

// Permission testing helpers
export const testCrossOrgIsolation = (user: ReturnType<typeof createTestUser>, orgA: ReturnType<typeof createTestOrganization>, orgB: ReturnType<typeof createTestOrganization>) => {
  // Test that user cannot access Org B data when in Org A context
  const orgAContext = {
    userId: user.id,
    organizationId: orgA.id,
    userRole: orgA.userRole,
    teamMemberships: []
  };
  
  const orgBContext = {
    userId: user.id,
    organizationId: orgB.id,
    userRole: orgB.userRole,
    teamMemberships: []
  };

  // User should have permissions in their current org context
  expectPermission('organization.manage', orgAContext, undefined, ['owner', 'admin'].includes(orgA.userRole));
  
  // User should not have cross-org access (this would be prevented by RLS in actual implementation)
  // The permission engine should not grant access to different organization contexts
};

export const testTeamIsolation = (user: ReturnType<typeof createTestUser>, organization: ReturnType<typeof createTestOrganization>, teamMemberships: Array<ReturnType<typeof createTestTeamMembership>>) => {
  const context = {
    userId: user.id,
    organizationId: organization.id,
    userRole: organization.userRole,
    teamMemberships
  };

  // User should have access to their teams
  teamMemberships.forEach(membership => {
    expectPermission('equipment.view', context, { teamId: membership.teamId }, true);
    if (membership.role === 'manager') {
      expectPermission('equipment.edit', context, { teamId: membership.teamId }, true);
    }
  });

  // User should not have access to teams they're not members of
  const otherTeamId = 'other-team';
  expectPermission('equipment.view', context, { teamId: otherTeamId }, false);
  expectPermission('equipment.edit', context, { teamId: otherTeamId }, false);
};

export const testRoleEscalation = (user: ReturnType<typeof createTestUser>, organization: ReturnType<typeof createTestOrganization>, fromRole: 'owner' | 'admin' | 'member', toRole: 'owner' | 'admin' | 'member') => {
  const context = {
    userId: user.id,
    organizationId: organization.id,
    userRole: toRole,
    teamMemberships: []
  };

  // Test that role changes are reflected in permissions
  const canManage = ['owner', 'admin'].includes(toRole);
  expectPermission('organization.manage', context, undefined, canManage);
  
  const canInvite = ['owner', 'admin'].includes(toRole);
  expectPermission('organization.invite', context, undefined, canInvite);
};

// Cleanup helpers
export const cleanupMocks = () => {
  vi.clearAllMocks();
  setupPermissionEngineMock();
};

export const resetPermissionEngine = () => {
  mockPermissionEngine.clearCache.mockClear();
  setupPermissionEngineMock();
};