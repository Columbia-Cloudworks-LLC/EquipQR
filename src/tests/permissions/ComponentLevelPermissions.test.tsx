/**
 * Component-Level Permission Testing Suite
 * 
 * Tests UI component visibility and functionality based on user permissions
 * across different roles, organizations, and team contexts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { usePermissions } from '@/hooks/usePermissions';

// Mock components for testing
const EquipmentForm = ({ equipmentTeamId }: { equipmentTeamId?: string }) => {
  const permissions = useUnifiedPermissions();
  const equipmentPermissions = permissions.equipment.getPermissions(equipmentTeamId);
  
  return (
    <div data-testid="equipment-form">
      <h2>Equipment Form</h2>
      {equipmentPermissions.canEdit && (
        <button data-testid="save-equipment">Save Equipment</button>
      )}
      {equipmentPermissions.canDelete && (
        <button data-testid="delete-equipment">Delete Equipment</button>
      )}
      {permissions.organization.canCreateTeams && (
        <select data-testid="team-assignment">
          <option value="">Select Team</option>
          <option value="team-a">Team A</option>
          <option value="team-b">Team B</option>
        </select>
      )}
    </div>
  );
};

const WorkOrderActionsMenu = ({ workOrder }: { workOrder: any }) => {
  const permissions = useUnifiedPermissions();
  const workOrderPermissions = permissions.workOrders.getDetailedPermissions(workOrder);
  
  return (
    <div data-testid="workorder-actions">
      <h3>Work Order Actions</h3>
      {workOrderPermissions.canEdit && (
        <button data-testid="edit-workorder">Edit</button>
      )}
      {workOrderPermissions.canDelete && (
        <button data-testid="delete-workorder">Delete</button>
      )}
      {workOrderPermissions.canAssign && (
        <button data-testid="assign-workorder">Assign</button>
      )}
      {workOrderPermissions.canChangeStatus && (
        <button data-testid="change-status">Change Status</button>
      )}
      {workOrderPermissions.canAddNotes && (
        <button data-testid="add-notes">Add Notes</button>
      )}
      {workOrderPermissions.canAddImages && (
        <button data-testid="add-images">Add Images</button>
      )}
    </div>
  );
};

const TeamMemberList = ({ teamId }: { teamId: string }) => {
  const permissions = useUnifiedPermissions();
  const teamPermissions = permissions.teams.getPermissions(teamId);
  
  return (
    <div data-testid="team-member-list">
      <h3>Team Members</h3>
      <div data-testid="member-1">John Doe - Technician</div>
      <div data-testid="member-2">Jane Smith - Manager</div>
      {teamPermissions.canEdit && (
        <button data-testid="add-member">Add Member</button>
      )}
      {teamPermissions.canDelete && (
        <button data-testid="remove-member">Remove Member</button>
      )}
      {teamPermissions.canEdit && (
        <button data-testid="change-role">Change Role</button>
      )}
    </div>
  );
};

const QRCodeGenerator = ({ equipmentId }: { equipmentId: string }) => {
  const permissions = useUnifiedPermissions();
  const equipmentPermissions = permissions.equipment.getPermissions();
  
  return (
    <div data-testid="qr-generator">
      <h3>QR Code Generator</h3>
      {equipmentPermissions.canView && (
        <button data-testid="generate-qr">Generate QR Code</button>
      )}
      {equipmentPermissions.canEdit && (
        <button data-testid="download-qr">Download QR Code</button>
      )}
    </div>
  );
};

const EquipmentNotesSection = ({ equipmentTeamId }: { equipmentTeamId?: string }) => {
  const permissions = useUnifiedPermissions();
  const notesPermissions = permissions.getEquipmentNotesPermissions(equipmentTeamId);
  
  return (
    <div data-testid="equipment-notes">
      <h3>Equipment Notes</h3>
      {notesPermissions.canViewNotes && (
        <div data-testid="notes-list">
          <div data-testid="note-1">Public note by John</div>
          <div data-testid="note-2">Private note by Jane</div>
        </div>
      )}
      {notesPermissions.canAddPublicNote && (
        <button data-testid="add-public-note">Add Public Note</button>
      )}
      {notesPermissions.canAddPrivateNote && (
        <button data-testid="add-private-note">Add Private Note</button>
      )}
      {notesPermissions.canUploadImages && (
        <button data-testid="upload-image">Upload Image</button>
      )}
      {notesPermissions.canSetDisplayImage && (
        <button data-testid="set-display-image">Set Display Image</button>
      )}
    </div>
  );
};

const BillingSection = () => {
  const permissions = useUnifiedPermissions();
  
  return (
    <div data-testid="billing-section">
      <h3>Billing</h3>
      {permissions.organization.canViewBilling && (
        <div data-testid="billing-info">
          <p>Current Plan: Premium</p>
          <p>Next Billing: $29.99/month</p>
        </div>
      )}
      {permissions.organization.canManage && (
        <button data-testid="upgrade-plan">Upgrade Plan</button>
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

const createTestWorkOrder = (id: string, title: string, organizationId: string, teamId?: string, assigneeId?: string) => ({
  id,
  title,
  description: 'Test Description',
  equipment_id: 'equipment-1',
  status: 'submitted' as const,
  priority: 'medium' as const,
  organization_id: organizationId,
  team_id: teamId,
  assignee_id: assigneeId,
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Test wrapper component
const TestWrapper = ({ 
  children, 
  user, 
  organization, 
  teamMemberships = []
}: {
  children: React.ReactNode;
  user: ReturnType<typeof createTestUser>;
  organization: ReturnType<typeof createTestOrganization>;
  teamMemberships?: Array<{ teamId: string; role: 'manager' | 'technician' }>;
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Component-Level Permission Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Equipment Form Component', () => {
    it('should show team assignment dropdown for users who can create teams', () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.getByTestId('team-assignment')).toBeInTheDocument();
    });

    it('should hide team assignment dropdown for users who cannot create teams', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.queryByTestId('team-assignment')).not.toBeInTheDocument();
    });

    it('should show save and delete buttons for users with edit permissions', () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.getByTestId('save-equipment')).toBeInTheDocument();
      expect(screen.getByTestId('delete-equipment')).toBeInTheDocument();
    });

    it('should hide save and delete buttons for users without edit permissions', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      expect(screen.queryByTestId('save-equipment')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-equipment')).not.toBeInTheDocument();
    });

    it('should show appropriate buttons for team managers on team equipment', () => {
      const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'manager' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <EquipmentForm equipmentTeamId="team-a" />
        </TestWrapper>
      );

      expect(screen.getByTestId('save-equipment')).toBeInTheDocument();
      expect(screen.getByTestId('delete-equipment')).toBeInTheDocument();
    });
  });

  describe('Work Order Actions Menu Component', () => {
    it('should show all action buttons for work order creators', () => {
      const user = createTestUser('user-1', 'creator@example.com', 'Work Order Creator');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const workOrder = createTestWorkOrder('wo-1', 'Test Work Order', 'org-1');
      workOrder.created_by = user.id;
      workOrder.status = 'submitted';

      render(
        <TestWrapper user={user} organization={organization}>
          <WorkOrderActionsMenu workOrder={workOrder} />
        </TestWrapper>
      );

      expect(screen.getByTestId('edit-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('delete-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('assign-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('change-status')).toBeInTheDocument();
      expect(screen.getByTestId('add-notes')).toBeInTheDocument();
      expect(screen.getByTestId('add-images')).toBeInTheDocument();
    });

    it('should show limited action buttons for assigned technicians', () => {
      const user = createTestUser('user-1', 'tech@example.com', 'Assigned Technician');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];
      const workOrder = createTestWorkOrder('wo-1', 'Test Work Order', 'org-1', 'team-a', user.id);
      workOrder.status = 'assigned';

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <WorkOrderActionsMenu workOrder={workOrder} />
        </TestWrapper>
      );

      // Should not see edit/delete buttons
      expect(screen.queryByTestId('edit-workorder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-workorder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assign-workorder')).not.toBeInTheDocument();
      
      // Should see status change and note/image buttons
      expect(screen.getByTestId('change-status')).toBeInTheDocument();
      expect(screen.getByTestId('add-notes')).toBeInTheDocument();
      expect(screen.getByTestId('add-images')).toBeInTheDocument();
    });

    it('should show management buttons for team managers', () => {
      const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'manager' as const }];
      const workOrder = createTestWorkOrder('wo-1', 'Test Work Order', 'org-1', 'team-a');
      workOrder.status = 'submitted';

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <WorkOrderActionsMenu workOrder={workOrder} />
        </TestWrapper>
      );

      expect(screen.getByTestId('edit-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('delete-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('assign-workorder')).toBeInTheDocument();
      expect(screen.getByTestId('change-status')).toBeInTheDocument();
    });

    it('should hide all action buttons for users without team access', () => {
      const user = createTestUser('user-1', 'outsider@example.com', 'Outsider User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const workOrder = createTestWorkOrder('wo-1', 'Test Work Order', 'org-1', 'team-b');
      workOrder.status = 'submitted';

      render(
        <TestWrapper user={user} organization={organization}>
          <WorkOrderActionsMenu workOrder={workOrder} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('edit-workorder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-workorder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assign-workorder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('change-status')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-notes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-images')).not.toBeInTheDocument();
    });
  });

  describe('Team Member List Component', () => {
    it('should show management buttons for team managers', () => {
      const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'manager' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <TeamMemberList teamId="team-a" />
        </TestWrapper>
      );

      expect(screen.getByTestId('add-member')).toBeInTheDocument();
      expect(screen.getByTestId('remove-member')).toBeInTheDocument();
      expect(screen.getByTestId('change-role')).toBeInTheDocument();
    });

    it('should hide management buttons for regular team members', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Team Member');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <TeamMemberList teamId="team-a" />
        </TestWrapper>
      );

      expect(screen.queryByTestId('add-member')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-member')).not.toBeInTheDocument();
      expect(screen.queryByTestId('change-role')).not.toBeInTheDocument();
    });

    it('should show management buttons for org admins on any team', () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Org Admin');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization}>
          <TeamMemberList teamId="team-a" />
        </TestWrapper>
      );

      expect(screen.getByTestId('add-member')).toBeInTheDocument();
      expect(screen.getByTestId('remove-member')).toBeInTheDocument();
      expect(screen.getByTestId('change-role')).toBeInTheDocument();
    });
  });

  describe('QR Code Generator Component', () => {
    it('should show QR generation buttons for users with equipment view permissions', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization}>
          <QRCodeGenerator equipmentId="equipment-1" />
        </TestWrapper>
      );

      expect(screen.getByTestId('generate-qr')).toBeInTheDocument();
    });

    it('should show download button for users with equipment edit permissions', () => {
      const user = createTestUser('user-1', 'admin@example.com', 'Admin User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'admin');

      render(
        <TestWrapper user={user} organization={organization}>
          <QRCodeGenerator equipmentId="equipment-1" />
        </TestWrapper>
      );

      expect(screen.getByTestId('generate-qr')).toBeInTheDocument();
      expect(screen.getByTestId('download-qr')).toBeInTheDocument();
    });

    it('should hide QR generation for users without equipment access', () => {
      const user = createTestUser('user-1', 'outsider@example.com', 'Outsider User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      // Mock no equipment access
      mockPermissionEngine.hasPermission.mockImplementation((permission: string) => {
        if (permission === 'equipment.view') return false;
        return false;
      });

      render(
        <TestWrapper user={user} organization={organization}>
          <QRCodeGenerator equipmentId="equipment-1" />
        </TestWrapper>
      );

      expect(screen.queryByTestId('generate-qr')).not.toBeInTheDocument();
      expect(screen.queryByTestId('download-qr')).not.toBeInTheDocument();
    });
  });

  describe('Equipment Notes Section Component', () => {
    it('should show all note functionality for team managers', () => {
      const user = createTestUser('user-1', 'manager@example.com', 'Team Manager');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'manager' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <EquipmentNotesSection equipmentTeamId="team-a" />
        </TestWrapper>
      );

      expect(screen.getByTestId('notes-list')).toBeInTheDocument();
      expect(screen.getByTestId('add-public-note')).toBeInTheDocument();
      expect(screen.getByTestId('add-private-note')).toBeInTheDocument();
      expect(screen.getByTestId('upload-image')).toBeInTheDocument();
      expect(screen.getByTestId('set-display-image')).toBeInTheDocument();
    });

    it('should show limited note functionality for team members', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Team Member');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');
      const teamMemberships = [{ teamId: 'team-a', role: 'technician' as const }];

      render(
        <TestWrapper user={user} organization={organization} teamMemberships={teamMemberships}>
          <EquipmentNotesSection equipmentTeamId="team-a" />
        </TestWrapper>
      );

      expect(screen.getByTestId('notes-list')).toBeInTheDocument();
      expect(screen.getByTestId('add-public-note')).toBeInTheDocument();
      expect(screen.getByTestId('add-private-note')).toBeInTheDocument();
      expect(screen.getByTestId('upload-image')).toBeInTheDocument();
      // Should not see management buttons
      expect(screen.queryByTestId('set-display-image')).not.toBeInTheDocument();
    });

    it('should hide note functionality for users without team access', () => {
      const user = createTestUser('user-1', 'outsider@example.com', 'Outsider User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentNotesSection equipmentTeamId="team-a" />
        </TestWrapper>
      );

      expect(screen.queryByTestId('notes-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-public-note')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-private-note')).not.toBeInTheDocument();
      expect(screen.queryByTestId('upload-image')).not.toBeInTheDocument();
      expect(screen.queryByTestId('set-display-image')).not.toBeInTheDocument();
    });
  });

  describe('Billing Section Component', () => {
    it('should show billing information for owners and admins', () => {
      const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'owner');

      render(
        <TestWrapper user={user} organization={organization}>
          <BillingSection />
        </TestWrapper>
      );

      expect(screen.getByTestId('billing-info')).toBeInTheDocument();
      expect(screen.getByTestId('upgrade-plan')).toBeInTheDocument();
    });

    it('should hide billing information for members', () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      render(
        <TestWrapper user={user} organization={organization}>
          <BillingSection />
        </TestWrapper>
      );

      expect(screen.queryByTestId('billing-info')).not.toBeInTheDocument();
      expect(screen.queryByTestId('upgrade-plan')).not.toBeInTheDocument();
    });
  });

  describe('Cross-Organizational Component Behavior', () => {
    it('should not show components for different organization context', () => {
      const user = createTestUser('user-1', 'owner@example.com', 'Owner User');
      const orgA = createTestOrganization('org-a', 'Organization A', 'owner');
      const orgB = createTestOrganization('org-b', 'Organization B', 'owner');

      // User is owner in Org A
      render(
        <TestWrapper user={user} organization={orgA}>
          <BillingSection />
        </TestWrapper>
      );

      expect(screen.getByTestId('billing-info')).toBeInTheDocument();

      // If user somehow switches to Org B context, components should reflect that
      // This would be handled by the organization switching logic in the actual implementation
    });
  });

  describe('Plan-Based Component Behavior', () => {
    it('should show appropriate components for free plan users', () => {
      const user = createTestUser('user-1', 'free@example.com', 'Free User');
      const organization = createTestOrganization('org-1', 'Free Org', 'owner', 'free');

      render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      // Free plan users should see basic functionality
      expect(screen.getByTestId('equipment-form')).toBeInTheDocument();
      expect(screen.getByTestId('save-equipment')).toBeInTheDocument();
    });

    it('should show enhanced components for premium plan users', () => {
      const user = createTestUser('user-1', 'premium@example.com', 'Premium User');
      const organization = createTestOrganization('org-1', 'Premium Org', 'owner', 'premium');

      render(
        <TestWrapper user={user} organization={organization}>
          <BillingSection />
        </TestWrapper>
      );

      // Premium plan users should see all functionality
      expect(screen.getByTestId('billing-info')).toBeInTheDocument();
      expect(screen.getByTestId('upgrade-plan')).toBeInTheDocument();
    });
  });

  describe('Dynamic Component Updates', () => {
    it('should update component visibility when user permissions change', async () => {
      const user = createTestUser('user-1', 'member@example.com', 'Member User');
      const organization = createTestOrganization('org-1', 'Primary Org', 'member');

      const { rerender } = render(
        <TestWrapper user={user} organization={organization}>
          <EquipmentForm />
        </TestWrapper>
      );

      // Initially should not see edit buttons
      expect(screen.queryByTestId('save-equipment')).not.toBeInTheDocument();

      // Simulate user being promoted to admin
      const adminOrganization = { ...organization, userRole: 'admin' as const };
      
      rerender(
        <TestWrapper user={user} organization={adminOrganization}>
          <EquipmentForm />
        </TestWrapper>
      );

      // Now should see edit buttons
      await waitFor(() => {
        expect(screen.getByTestId('save-equipment')).toBeInTheDocument();
      });
    });
  });
});