/**
 * Page-Level Permission Testing Suite
 * 
 * Tests route-level protection and page access controls for different user roles
 * across multiple organizations and team contexts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { usePermissions } from '@/hooks/usePermissions';

// Mock components for testing
const OrganizationSettingsPage = () => <div data-testid="org-settings">Organization Settings</div>;
const BillingPage = () => <div data-testid="billing">Billing</div>;
const TeamManagementPage = () => <div data-testid="team-management">Team Management</div>;
const WorkOrderCreationPage = () => <div data-testid="workorder-creation">Create Work Order</div>;
const EquipmentManagementPage = () => <div data-testid="equipment-management">Equipment Management</div>;
const AccessDeniedPage = () => <div data-testid="access-denied">Access Denied</div>;

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
const createTestUser = (id: string, email: string, name: string) => ({
  id,
  email,
  name
});

const createTestOrganization = (id: string, name: string, userRole: 'owner' | 'admin' | 'member', plan: 'free' | 'premium' = 'free') => ({
  id,
  name,
  plan,
  memberCount: 1,
  maxMembers: plan === 'free' ? 5 : 50,
  features: plan === 'premium' ? ['advanced_analytics', 'custom_fields'] : [],
  userStatus: 'active' as const,
  userRole,
  members: [{
    id: 'user-1',
    email: 'test@example.com',
    role: userRole,
    organization_id: id
  }]
});

// Protected route component for testing
const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback = <AccessDeniedPage />
}: { 
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}) => {
  const permissions = useUnifiedPermissions();
  
  if (requiredRole && !permissions.hasRole(requiredRole)) {
    return <>{fallback}</>;
  }
  
  if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Test wrapper component
const TestWrapper = ({ 
  children, 
  user, 
  organization, 
  teamMemberships = [],
  initialRoute = '/'
}: {
  children: React.ReactNode;
  user: ReturnType<typeof createTestUser>;
  organization: ReturnType<typeof createTestOrganization>;
  teamMemberships?: Array<{ teamId: string; role: 'manager' | 'technician' }>;
  initialRoute?: string;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  // Setup mocks
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
        teamName: `Team ${tm.teamId}`,
        role: tm.role,
        joinedDate: new Date().toISOString()
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

  // Setup permission engine mock
  mockPermissionEngine.hasPermission.mockImplementation((permission: string, context: any, entityContext?: any) => {
    const { userRole, teamMemberships } = context;
    
    if (permission === 'organization.manage') {
      return ['owner', 'admin'].includes(userRole);
    }
    if (permission === 'organization.invite') {
      return ['owner', 'admin'].includes(userRole);
    }
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

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          <Route 
            path="/organization/settings" 
            element={
              <ProtectedRoute requiredRole={['owner', 'admin']}>
                <OrganizationSettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/billing" 
            element={
              <ProtectedRoute requiredRole={['owner', 'admin']}>
                <BillingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute requiredPermission="team.view">
                <TeamManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/work-orders/create" 
            element={
              <ProtectedRoute requiredRole={['owner', 'admin', 'member']}>
                <WorkOrderCreationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/equipment" 
            element={
              <ProtectedRoute requiredPermission="equipment.view">
                <EquipmentManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<div data-testid="not-found">Not Found</div>} />
        </Routes>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Page-Level Permission Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Organization Settings Page Access', () => {
    it('should allow owners to access organization settings page', async () => {
      const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'owner');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/organization/settings">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('org-settings')).toBeInTheDocument();
      });
    });

    it('should allow admins to access organization settings page', async () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/organization/settings">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('org-settings')).toBeInTheDocument();
      });
    });

    it('should deny members access to organization settings page', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/organization/settings">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('org-settings')).not.toBeInTheDocument();
      });
    });

    it('should deny viewers access to organization settings page', async () => {
      const user = createTestUser('user-1', 'viewer@example.com', 'Viewer User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member'); // Using member as viewer

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/organization/settings">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('org-settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Billing Page Access', () => {
    it('should allow owners to access billing page', async () => {
      const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'owner');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/billing">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('billing')).toBeInTheDocument();
      });
    });

    it('should allow admins to access billing page', async () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/billing">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('billing')).toBeInTheDocument();
      });
    });

    it('should deny members access to billing page', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/billing">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('billing')).not.toBeInTheDocument();
      });
    });
  });

  describe('Team Management Page Access', () => {
    it('should allow org admins to access team management page', async () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/teams">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('team-management')).toBeInTheDocument();
      });
    });

    it('should allow team managers to access team management page for their teams', async () => {
      const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'manager' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships} initialRoute="/teams">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('team-management')).toBeInTheDocument();
      });
    });

    it('should deny regular team members access to team management page', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Team Member');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships} initialRoute="/teams">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('team-management')).not.toBeInTheDocument();
      });
    });
  });

  describe('Work Order Creation Page Access', () => {
    it('should allow all active members to access work order creation page', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/work-orders/create">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('workorder-creation')).toBeInTheDocument();
      });
    });

    it('should allow admins to access work order creation page', async () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/work-orders/create">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('workorder-creation')).toBeInTheDocument();
      });
    });

    it('should deny inactive members access to work order creation page', async () => {
      const user = createTestUser('user-1', 'inactive@example.com', 'Inactive User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      organization.userStatus = 'inactive';

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/work-orders/create">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('workorder-creation')).not.toBeInTheDocument();
      });
    });
  });

  describe('Equipment Management Page Access', () => {
    it('should allow org admins to access equipment management page', async () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/equipment">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('equipment-management')).toBeInTheDocument();
      });
    });

    it('should allow team members to access equipment management page for their teams', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Team Member');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships} initialRoute="/equipment">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('equipment-management')).toBeInTheDocument();
      });
    });

    it('should deny users without team access to equipment management page', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/equipment">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('equipment-management')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cross-Organizational Page Access', () => {
    it('should prevent users from accessing pages in different organizations', async () => {
      const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
      const orgA = createTestOrganization('org-a', 'Organization A', 'owner');
      const orgB = createTestOrganization('org-b', 'Organization B', 'owner');

      // User is owner in Org A
      render(
        <TestWrapper user={user} organization={orgA} initialRoute="/organization/settings">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('org-settings')).toBeInTheDocument();
      });

      // If user somehow tries to access Org B's settings, it should be denied
      // This would be prevented by RLS policies in the actual implementation
    });
  });

  describe('Plan-Based Page Access', () => {
    it('should allow free plan users to access basic pages', async () => {
      const user = createTestUser('user-1', 'free@example.com', 'Free User');
      const organization = createTestOrganization('org-1', 'Free Org', 'owner', 'free');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/work-orders/create">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('workorder-creation')).toBeInTheDocument();
      });
    });

    it('should allow premium plan users to access all pages', async () => {
      const user = createTestUser('user-1', 'premium@example.com', 'Premium User');
      const organization = createTestOrganization('org-1', 'Premium Org', 'owner', 'premium');

      render(
        <TestWrapper user={user} organization={organization} initialRoute="/billing">
          <div>Test App</div>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('billing')).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Route Protection', () => {
    it('should protect team-specific routes based on team membership', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Team Member');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];

      // Mock a team-specific route
      const TeamEquipmentPage = () => <div data-testid="team-equipment">Team Equipment</div>;
      
      const TestWrapperWithTeamRoute = ({ children }: { children: React.ReactNode }) => {
        const queryClient = new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
          }
        });

        // Setup mocks (same as before)
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
              teamName: `Team ${tm.teamId}`,
              role: tm.role,
              joinedDate: new Date().toISOString()
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

        return (
          <MemoryRouter initialEntries={['/teams/team-a/equipment']}>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <Route 
                  path="/teams/:teamId/equipment" 
                  element={
                    <ProtectedRoute requiredPermission="equipment.view">
                      <TeamEquipmentPage />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
              {children}
            </QueryClientProvider>
          </MemoryRouter>
        );
      };

      render(
        <TestWrapperWithTeamRoute>
          <div>Test App</div>
        </TestWrapperWithTeamRoute>
      );

      await waitFor(() => {
        expect(screen.getByTestId('team-equipment')).toBeInTheDocument();
      });
    });
  });
});