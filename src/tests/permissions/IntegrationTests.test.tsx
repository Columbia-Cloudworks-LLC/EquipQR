/**
 * Integration Tests for Cross-Organizational Permissions
 * 
 * Tests complete user workflows and complex scenarios that span multiple
 * components, services, and permission contexts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { usePermissions } from '@/hooks/usePermissions';
import {
  createTestUser,
  createTestOrganization,
  createTestTeam,
  createTestEquipment,
  createTestWorkOrder,
  createTestTeamMembership,
  buildOwnerScenario,
  buildAdminScenario,
  buildMemberScenario,
  buildTeamManagerScenario,
  buildTeamTechnicianScenario,
  buildMultiOrgScenario,
  buildTeamHierarchyScenario,
  buildInactiveUserScenario,
  buildPendingUserScenario,
  buildFreePlanScenario,
  buildPremiumPlanScenario,
  testCrossOrgIsolation,
  testTeamIsolation,
  testRoleEscalation,
  renderWithPermissions,
  cleanupMocks,
  resetPermissionEngine
} from './TestUtilities';

// Mock components for integration testing
const EquipmentManagementPage = ({ equipmentId }: { equipmentId?: string }) => {
  const permissions = useUnifiedPermissions();
  const equipmentPermissions = permissions.equipment.getPermissions(equipmentId);
  
  return (
    <div data-testid="equipment-management">
      <h1>Equipment Management</h1>
      {equipmentPermissions.canView && (
        <div data-testid="equipment-details">
          <h2>Equipment Details</h2>
          {equipmentPermissions.canEdit && (
            <button data-testid="edit-equipment">Edit Equipment</button>
          )}
          {equipmentPermissions.canDelete && (
            <button data-testid="delete-equipment">Delete Equipment</button>
          )}
        </div>
      )}
      {permissions.organization.canCreateTeams && (
        <div data-testid="team-assignment">
          <select data-testid="team-select">
            <option value="">Select Team</option>
            <option value="team-a">Team A</option>
            <option value="team-b">Team B</option>
          </select>
        </div>
      )}
    </div>
  );
};

const WorkOrderManagementPage = ({ workOrderId }: { workOrderId?: string }) => {
  const permissions = useUnifiedPermissions();
  const workOrder = workOrderId ? createTestWorkOrder(workOrderId, 'Test Work Order', 'org-1') : undefined;
  const workOrderPermissions = permissions.workOrders.getDetailedPermissions(workOrder);
  
  return (
    <div data-testid="workorder-management">
      <h1>Work Order Management</h1>
      {workOrderPermissions.canView && (
        <div data-testid="workorder-details">
          <h2>Work Order Details</h2>
          {workOrderPermissions.canEdit && (
            <button data-testid="edit-workorder">Edit Work Order</button>
          )}
          {workOrderPermissions.canDelete && (
            <button data-testid="delete-workorder">Delete Work Order</button>
          )}
          {workOrderPermissions.canAssign && (
            <button data-testid="assign-workorder">Assign Work Order</button>
          )}
          {workOrderPermissions.canChangeStatus && (
            <button data-testid="change-status">Change Status</button>
          )}
        </div>
      )}
    </div>
  );
};

const TeamManagementPage = ({ teamId }: { teamId?: string }) => {
  const permissions = useUnifiedPermissions();
  const teamPermissions = permissions.teams.getPermissions(teamId);
  
  return (
    <div data-testid="team-management">
      <h1>Team Management</h1>
      {teamPermissions.canView && (
        <div data-testid="team-details">
          <h2>Team Details</h2>
          {teamPermissions.canEdit && (
            <button data-testid="edit-team">Edit Team</button>
          )}
          {teamPermissions.canDelete && (
            <button data-testid="delete-team">Delete Team</button>
          )}
        </div>
      )}
    </div>
  );
};

const OrganizationSettingsPage = () => {
  const permissions = useUnifiedPermissions();
  
  return (
    <div data-testid="organization-settings">
      <h1>Organization Settings</h1>
      {permissions.organization.canManage && (
        <div data-testid="org-management">
          <h2>Organization Management</h2>
          {permissions.organization.canInviteMembers && (
            <button data-testid="invite-members">Invite Members</button>
          )}
          {permissions.organization.canCreateTeams && (
            <button data-testid="create-teams">Create Teams</button>
          )}
          {permissions.organization.canManageMembers && (
            <button data-testid="manage-members">Manage Members</button>
          )}
        </div>
      )}
      {permissions.organization.canViewBilling && (
        <div data-testid="billing-section">
          <h2>Billing</h2>
          <button data-testid="view-billing">View Billing</button>
        </div>
      )}
    </div>
  );
};

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

describe('Cross-Organizational Permission Integration Tests', () => {
  beforeEach(() => {
    cleanupMocks();
  });

  afterEach(() => {
    resetPermissionEngine();
  });

  describe('Complete User Workflows', () => {
    describe('Owner workflow - Full organization management', () => {
      it('should allow owners to perform all organization management tasks', async () => {
        const { user, organization } = buildOwnerScenario();
        
        renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
          expect(screen.getByTestId('invite-members')).toBeInTheDocument();
          expect(screen.getByTestId('create-teams')).toBeInTheDocument();
          expect(screen.getByTestId('manage-members')).toBeInTheDocument();
          expect(screen.getByTestId('billing-section')).toBeInTheDocument();
        });
      });

      it('should allow owners to manage equipment across all teams', async () => {
        const { user, organization } = buildOwnerScenario();
        const teamMemberships = [
          createTestTeamMembership('team-a', 'manager'),
          createTestTeamMembership('team-b', 'manager')
        ];
        
        renderWithPermissions(
          <EquipmentManagementPage equipmentId="team-a" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.getByTestId('equipment-details')).toBeInTheDocument();
          expect(screen.getByTestId('edit-equipment')).toBeInTheDocument();
          expect(screen.getByTestId('delete-equipment')).toBeInTheDocument();
          expect(screen.getByTestId('team-assignment')).toBeInTheDocument();
        });
      });
    });

    describe('Admin workflow - Team and member management', () => {
      it('should allow admins to manage teams and members but not billing', async () => {
        const { user, organization } = buildAdminScenario();
        
        renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
          expect(screen.getByTestId('invite-members')).toBeInTheDocument();
          expect(screen.getByTestId('create-teams')).toBeInTheDocument();
          expect(screen.getByTestId('manage-members')).toBeInTheDocument();
          expect(screen.queryByTestId('billing-section')).not.toBeInTheDocument();
        });
      });

      it('should allow admins to manage work orders across all teams', async () => {
        const { user, organization } = buildAdminScenario();
        const teamMemberships = [
          createTestTeamMembership('team-a', 'manager'),
          createTestTeamMembership('team-b', 'manager')
        ];
        
        renderWithPermissions(
          <WorkOrderManagementPage workOrderId="wo-1" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.getByTestId('workorder-details')).toBeInTheDocument();
          expect(screen.getByTestId('edit-workorder')).toBeInTheDocument();
          expect(screen.getByTestId('delete-workorder')).toBeInTheDocument();
          expect(screen.getByTestId('assign-workorder')).toBeInTheDocument();
          expect(screen.getByTestId('change-status')).toBeInTheDocument();
        });
      });
    });

    describe('Team Manager workflow - Team-specific management', () => {
      it('should allow team managers to manage their teams only', async () => {
        const { user, organization, teamMemberships } = buildTeamManagerScenario('org-1', 'team-a');
        
        renderWithPermissions(
          <TeamManagementPage teamId="team-a" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.getByTestId('team-details')).toBeInTheDocument();
          expect(screen.getByTestId('edit-team')).toBeInTheDocument();
          expect(screen.getByTestId('delete-team')).toBeInTheDocument();
        });
      });

      it('should prevent team managers from managing other teams', async () => {
        const { user, organization, teamMemberships } = buildTeamManagerScenario('org-1', 'team-a');
        
        renderWithPermissions(
          <TeamManagementPage teamId="team-b" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('team-details')).not.toBeInTheDocument();
          expect(screen.queryByTestId('edit-team')).not.toBeInTheDocument();
          expect(screen.queryByTestId('delete-team')).not.toBeInTheDocument();
        });
      });
    });

    describe('Team Technician workflow - Limited team access', () => {
      it('should allow technicians to view and update work orders in their team', async () => {
        const { user, organization, teamMemberships } = buildTeamTechnicianScenario('org-1', 'team-a');
        const workOrder = createTestWorkOrder('wo-1', 'Test Work Order', 'org-1', 'team-a', user.id);
        
        renderWithPermissions(
          <WorkOrderManagementPage workOrderId="wo-1" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.getByTestId('workorder-details')).toBeInTheDocument();
          expect(screen.queryByTestId('edit-workorder')).not.toBeInTheDocument();
          expect(screen.queryByTestId('delete-workorder')).not.toBeInTheDocument();
          expect(screen.queryByTestId('assign-workorder')).not.toBeInTheDocument();
          expect(screen.getByTestId('change-status')).toBeInTheDocument();
        });
      });

      it('should prevent technicians from accessing other teams', async () => {
        const { user, organization, teamMemberships } = buildTeamTechnicianScenario('org-1', 'team-a');
        
        renderWithPermissions(
          <EquipmentManagementPage equipmentId="team-b" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Multi-Organization Scenarios', () => {
    describe('User with different roles in different organizations', () => {
      it('should correctly scope permissions when switching organizations', async () => {
        const { user, orgA, orgB } = buildMultiOrgScenario();
        
        // Test Org A context (owner)
        const { rerender } = renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization: orgA }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
          expect(screen.getByTestId('billing-section')).toBeInTheDocument();
        });

        // Switch to Org B context (member)
        rerender(
          <OrganizationSettingsPage />
        );

        // Update mocks for Org B context
        mockUseSession.mockReturnValue({
          sessionData: {
            organizations: [orgB],
            currentOrganizationId: orgB.id,
            teamMemberships: [],
            lastUpdated: new Date().toISOString(),
            version: 1
          },
          isLoading: false,
          error: null,
          getCurrentOrganization: vi.fn(() => orgB),
          switchOrganization: vi.fn(),
          hasTeamRole: vi.fn(() => false),
          hasTeamAccess: vi.fn(() => false),
          canManageTeam: vi.fn(() => false),
          getUserTeamIds: vi.fn(() => []),
          refreshSession: vi.fn(),
          clearSession: vi.fn()
        });

        mockUseSimpleOrganization.mockReturnValue({
          currentOrganization: orgB,
          organizations: [orgB],
          userOrganizations: [orgB],
          setCurrentOrganization: vi.fn(),
          switchOrganization: vi.fn(),
          isLoading: false,
          error: null,
          refetch: vi.fn()
        });

        await waitFor(() => {
          expect(screen.queryByTestId('org-management')).not.toBeInTheDocument();
          expect(screen.queryByTestId('billing-section')).not.toBeInTheDocument();
        });
      });
    });

    describe('Cross-organizational data isolation', () => {
      it('should prevent access to data from different organizations', async () => {
        const { user, orgA, orgB } = buildMultiOrgScenario();
        
        // User in Org A should not see Org B data
        renderWithPermissions(
          <EquipmentManagementPage equipmentId="team-a" />,
          { user, organization: orgA }
        );

        await waitFor(() => {
          // This would be prevented by RLS policies in the actual implementation
          // The permission engine should not grant access to different organization contexts
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Team Hierarchy Scenarios', () => {
    describe('Complex team management scenarios', () => {
      it('should handle users with multiple team memberships correctly', async () => {
        const { user, organization, teamMemberships, hierarchy } = buildTeamHierarchyScenario();
        
        // User is manager of team-a and technician of team-b
        renderWithPermissions(
          <div>
            <EquipmentManagementPage equipmentId="team-a" />
            <EquipmentManagementPage equipmentId="team-b" />
            <EquipmentManagementPage equipmentId="team-c" />
          </div>,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          // Should have full access to team-a (manager)
          expect(screen.getAllByTestId('equipment-details')[0]).toBeInTheDocument();
          expect(screen.getAllByTestId('edit-equipment')[0]).toBeInTheDocument();
          
          // Should have limited access to team-b (technician)
          expect(screen.getAllByTestId('equipment-details')[1]).toBeInTheDocument();
          expect(screen.queryByTestId('edit-equipment')).not.toBeInTheDocument();
          
          // Should have no access to team-c
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Edge Case Scenarios', () => {
    describe('Inactive and pending users', () => {
      it('should prevent inactive users from accessing any resources', async () => {
        const { user, organization } = buildInactiveUserScenario();
        
        renderWithPermissions(
          <div>
            <OrganizationSettingsPage />
            <EquipmentManagementPage />
            <WorkOrderManagementPage />
          </div>,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('org-management')).not.toBeInTheDocument();
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
          expect(screen.queryByTestId('workorder-details')).not.toBeInTheDocument();
        });
      });

      it('should prevent pending users from accessing any resources', async () => {
        const { user, organization } = buildPendingUserScenario();
        
        renderWithPermissions(
          <div>
            <OrganizationSettingsPage />
            <EquipmentManagementPage />
            <WorkOrderManagementPage />
          </div>,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('org-management')).not.toBeInTheDocument();
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
          expect(screen.queryByTestId('workorder-details')).not.toBeInTheDocument();
        });
      });
    });

    describe('Plan-based restrictions', () => {
      it('should enforce free plan limitations', async () => {
        const { user, organization } = buildFreePlanScenario();
        
        renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
          // Free plan should have limited features
          expect(organization.maxMembers).toBe(5);
          expect(organization.features).toEqual([]);
        });
      });

      it('should allow premium plan features', async () => {
        const { user, organization } = buildPremiumPlanScenario();
        
        renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
          // Premium plan should have enhanced features
          expect(organization.maxMembers).toBe(50);
          expect(organization.features).toContain('advanced_analytics');
          expect(organization.features).toContain('custom_fields');
        });
      });
    });
  });

  describe('Permission Escalation and De-escalation', () => {
    describe('Role changes', () => {
      it('should immediately reflect permission changes when role is escalated', async () => {
        const { user, organization } = buildMemberScenario();
        
        const { rerender } = renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('org-management')).not.toBeInTheDocument();
        });

        // Simulate role escalation to admin
        const adminOrganization = { ...organization, userRole: 'admin' as const };
        
        rerender(
          <OrganizationSettingsPage />
        );

        // Update mocks for admin role
        mockUseSession.mockReturnValue({
          sessionData: {
            organizations: [adminOrganization],
            currentOrganizationId: adminOrganization.id,
            teamMemberships: [],
            lastUpdated: new Date().toISOString(),
            version: 1
          },
          isLoading: false,
          error: null,
          getCurrentOrganization: vi.fn(() => adminOrganization),
          switchOrganization: vi.fn(),
          hasTeamRole: vi.fn(() => false),
          hasTeamAccess: vi.fn(() => false),
          canManageTeam: vi.fn(() => false),
          getUserTeamIds: vi.fn(() => []),
          refreshSession: vi.fn(),
          clearSession: vi.fn()
        });

        mockUseSimpleOrganization.mockReturnValue({
          currentOrganization: adminOrganization,
          organizations: [adminOrganization],
          userOrganizations: [adminOrganization],
          setCurrentOrganization: vi.fn(),
          switchOrganization: vi.fn(),
          isLoading: false,
          error: null,
          refetch: vi.fn()
        });

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
        });
      });

      it('should immediately reflect permission changes when role is de-escalated', async () => {
        const { user, organization } = buildAdminScenario();
        
        const { rerender } = renderWithPermissions(
          <OrganizationSettingsPage />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.getByTestId('org-management')).toBeInTheDocument();
        });

        // Simulate role de-escalation to member
        const memberOrganization = { ...organization, userRole: 'member' as const };
        
        rerender(
          <OrganizationSettingsPage />
        );

        // Update mocks for member role
        mockUseSession.mockReturnValue({
          sessionData: {
            organizations: [memberOrganization],
            currentOrganizationId: memberOrganization.id,
            teamMemberships: [],
            lastUpdated: new Date().toISOString(),
            version: 1
          },
          isLoading: false,
          error: null,
          getCurrentOrganization: vi.fn(() => memberOrganization),
          switchOrganization: vi.fn(),
          hasTeamRole: vi.fn(() => false),
          hasTeamAccess: vi.fn(() => false),
          canManageTeam: vi.fn(() => false),
          getUserTeamIds: vi.fn(() => []),
          refreshSession: vi.fn(),
          clearSession: vi.fn()
        });

        mockUseSimpleOrganization.mockReturnValue({
          currentOrganization: memberOrganization,
          organizations: [memberOrganization],
          userOrganizations: [memberOrganization],
          setCurrentOrganization: vi.fn(),
          switchOrganization: vi.fn(),
          isLoading: false,
          error: null,
          refetch: vi.fn()
        });

        await waitFor(() => {
          expect(screen.queryByTestId('org-management')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Real-time Permission Updates', () => {
    describe('Team membership changes', () => {
      it('should update permissions when team membership is added', async () => {
        const { user, organization } = buildMemberScenario();
        
        const { rerender } = renderWithPermissions(
          <EquipmentManagementPage equipmentId="team-a" />,
          { user, organization }
        );

        await waitFor(() => {
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
        });

        // Simulate team membership addition
        const teamMemberships = [createTestTeamMembership('team-a', 'technician')];
        
        rerender(
          <EquipmentManagementPage equipmentId="team-a" />
        );

        // Update mocks for team membership
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

        await waitFor(() => {
          expect(screen.getByTestId('equipment-details')).toBeInTheDocument();
        });
      });

      it('should update permissions when team membership is removed', async () => {
        const { user, organization, teamMemberships } = buildTeamManagerScenario();
        
        const { rerender } = renderWithPermissions(
          <EquipmentManagementPage equipmentId="team-a" />,
          { user, organization, teamMemberships }
        );

        await waitFor(() => {
          expect(screen.getByTestId('equipment-details')).toBeInTheDocument();
        });

        // Simulate team membership removal
        rerender(
          <EquipmentManagementPage equipmentId="team-a" />
        );

        // Update mocks for no team membership
        mockUseSession.mockReturnValue({
          sessionData: {
            organizations: [organization],
            currentOrganizationId: organization.id,
            teamMemberships: [],
            lastUpdated: new Date().toISOString(),
            version: 1
          },
          isLoading: false,
          error: null,
          getCurrentOrganization: vi.fn(() => organization),
          switchOrganization: vi.fn(),
          hasTeamRole: vi.fn(() => false),
          hasTeamAccess: vi.fn(() => false),
          canManageTeam: vi.fn(() => false),
          getUserTeamIds: vi.fn(() => []),
          refreshSession: vi.fn(),
          clearSession: vi.fn()
        });

        await waitFor(() => {
          expect(screen.queryByTestId('equipment-details')).not.toBeInTheDocument();
        });
      });
    });
  });
});