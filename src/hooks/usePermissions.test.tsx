import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermissions, useWorkOrderPermissions } from './usePermissions';
import { 
  createMockUserContext,
  createMockSimpleOrganizationContext
} from '@vitest-harness/mocks/testTypes';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';

// Mock the dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn()
  }))
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    sessionData: {
      user: { id: 'user-1' },
      session: { access_token: 'token' }
    },
    isLoading: false,
    error: null,
    getCurrentOrganization: vi.fn(() => ({
      id: 'org-1',
      name: 'Test Organization',
      userRole: 'admin'
    })),
    getUserTeamIds: vi.fn(() => ['team-1']),
    hasTeamAccess: vi.fn((teamId: string) => teamId === 'team-1'),
    canManageTeam: vi.fn((teamId: string) => teamId === 'team-1')
  }))
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: vi.fn()
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: vi.fn()
}));

import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useUser } from '@/contexts/useUser';
import { useSession } from '@/hooks/useSession';

// Mock the permission engine with comprehensive permission handling
vi.mock('@/services/permissions/PermissionEngine', () => ({
  permissionEngine: {
    hasPermission: vi.fn((permission: string, context: { userRole?: string; organizationId?: string; teamId?: string }) => {
      const role = context?.userRole;
      
      // Organization permissions
      if (permission === 'organization.manage') {
        return ['owner', 'admin'].includes(role);
      }
      if (permission === 'organization.invite') {
        return ['owner', 'admin'].includes(role);
      }
      
      // Work order permissions
      if (permission === 'workorder.view') {
        return ['owner', 'admin', 'member'].includes(role);
      }
      if (permission === 'workorder.edit') {
        return ['admin', 'owner', 'member'].includes(role);
      }
      if (permission === 'workorder.assign') {
        return ['owner', 'admin'].includes(role);
      }
      if (permission === 'workorder.changestatus') {
        return ['owner', 'admin', 'member'].includes(role);
      }
      
      // Equipment permissions
      if (permission === 'equipment.view') {
        return ['admin', 'owner', 'member'].includes(role);
      }
      if (permission === 'equipment.edit') {
        return ['admin', 'owner'].includes(role);
      }
      if (permission === 'equipment.create') {
        // #650: org admins/owners create org-wide; team-scoped users would
        // require team membership lookup which the mock context here does
        // not carry, so admins/owners pass and member-with-team scenarios
        // are exercised in the UnifiedPermissions test suite.
        return ['admin', 'owner'].includes(role);
      }
      
      // Team permissions
      if (permission === 'team.view') {
        return ['owner', 'admin', 'member'].includes(role);
      }
      if (permission === 'team.manage') {
        return ['owner', 'admin'].includes(role);
      }
      if (permission === 'team.create') {
        return ['owner', 'admin'].includes(role);
      }
      
      return false;
    }),
    clearCache: vi.fn()
  }
}));

const mockUseSimpleOrganization = vi.mocked(useSimpleOrganization);
const mockUseUser = vi.mocked(useUser);
const mockUseSession = vi.mocked(useSession);

const createTestOrganization = (role: 'owner' | 'admin' | 'member' = 'member') => ({
    id: 'org-1',
    name: 'Test Organization',
    plan: 'free' as const,
    memberCount: 1,
    maxMembers: 5,
    features: [],
    userStatus: 'active' as const,
    userRole: role,
    members: [
      {
        id: 'user-1',
        email: 'test@example.com',
        role,
        organization_id: 'org-1'
      }
    ]
  });

const updateSessionMockForRole = (role: 'owner' | 'admin' | 'member') => {
    mockUseSession.mockReturnValue({
      sessionData: {
        organizations: [{
          id: 'org-1',
          name: 'Test Organization',
          plan: 'free' as const,
          memberCount: 1,
          maxMembers: 5,
          features: [],
          userRole: role as 'owner' | 'admin' | 'member',
          userStatus: 'active' as const
        }],
        currentOrganizationId: 'org-1',
        teamMemberships: [],
        lastUpdated: new Date().toISOString(),
        version: 1
      },
      isLoading: false,
      error: null,
      getCurrentOrganization: vi.fn(() => ({
        id: 'org-1',
        name: 'Test Organization',
        plan: 'free' as const,
        memberCount: 1,
        maxMembers: 5,
        features: [],
        userRole: role as 'owner' | 'admin' | 'member',
        userStatus: 'active' as const
      })),
      switchOrganization: vi.fn(),
      hasTeamRole: vi.fn(() => false),
      hasTeamAccess: vi.fn((teamId: string) => teamId === 'team-1'),
      canManageTeam: vi.fn((teamId: string) => teamId === 'team-1'),
      getUserTeamIds: vi.fn(() => ['team-1']),
      refreshSession: vi.fn(),
      clearSession: vi.fn()
    });
  };

const createTestUser = () => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User'
  });

const setupPermissionsMocks = (
    sessionRole: 'owner' | 'admin' | 'member',
    orgRole: 'owner' | 'admin' | 'member' = sessionRole,
  ) => {
    updateSessionMockForRole(sessionRole);
    mockUseSimpleOrganization.mockReturnValue(
      createMockSimpleOrganizationContext(createTestOrganization(orgRole)),
    );
    mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));
  };

const renderPermissionsForRole = (
  sessionRole: 'owner' | 'admin' | 'member',
  orgRole: 'owner' | 'admin' | 'member' = sessionRole,
) => {
  setupPermissionsMocks(sessionRole, orgRole);
  return renderHook(() => usePermissions());
};

const renderWorkOrderPermissionsForRole = (
  role: 'owner' | 'admin' | 'member',
  workOrder?: WorkOrderData,
) => {
  setupPermissionsMocks(role);
  return renderHook(() => useWorkOrderPermissions(workOrder));
};

const adminSubmittedWorkOrder = {
  teamId: 'team-1',
  assigneeId: 'user-1',
  status: 'submitted',
  createdByName: 'Test User',
} as WorkOrderData;

const renderAdminPermissions = () => {
  setupPermissionsMocks('admin');
  return renderHook(() => usePermissions());
};

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.hasRole(['admin'])).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should return true if user has any of the specified roles', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.hasRole(['admin', 'owner'])).toBe(true);
    });
  });

  describe('canManageEquipment', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManageEquipment()).toBe(true);
    });

    it('should return false for view-only role', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canManageEquipment()).toBe(false);
    });
  });

  describe('canManageWorkOrder', () => {
    it('should return true for technician role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManageWorkOrder()).toBe(true);
    });

    it('should return true for member role (members can edit work orders)', () => {
      const { result } = renderPermissionsForRole('member');
      
      // Members can manage work orders according to the permission engine
      expect(result.current.canManageWorkOrder()).toBe(true);
    });
  });

  describe('canCreateTeam', () => {
    it('should return true for owner role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canCreateTeam()).toBe(true);
    });

    it('should return false for member role', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canCreateTeam()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing user', () => {
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin')),
      );
      mockUseUser.mockReturnValue(createMockUserContext(null));

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should handle missing organization', () => {
      mockUseSimpleOrganization.mockReturnValue(createMockSimpleOrganizationContext(null));
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should handle empty members array', () => {
      const orgWithNoMembers = createTestOrganization('admin');
      // Remove members property to test edge case
      delete (orgWithNoMembers as unknown as { members?: unknown }).members;
      
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(orgWithNoMembers)
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasRole(['admin'])).toBe(false);
    });
  });

  describe('canManageTeam', () => {
    it('should return true for team manager', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManageTeam('team-1')).toBe(true);
    });

    it('should return false for non-team member', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canManageTeam('team-2')).toBe(false);
    });
  });

  describe('canViewTeam', () => {
    it('should return true for team member', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canViewTeam('team-1')).toBe(true);
    });
  });

  describe('canViewEquipment', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canViewEquipment()).toBe(true);
    });

    it('should work with equipment team ID', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canViewEquipment('team-1')).toBe(true);
    });
  });

  describe('canCreateEquipment', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');

      expect(result.current.canCreateEquipment()).toBe(true);
    });

    // #650: the no-argument compatibility gate must remain owner/admin-only
    // so call sites that intentionally check org-wide create rights are not
    // silently broadened.
    it('should return false for member role (no team context)', () => {
      const { result } = renderPermissionsForRole('member');

      expect(result.current.canCreateEquipment()).toBe(false);
    });
  });

  describe('canCreateEquipmentForTeam (#650)', () => {
    it('returns true for admin role on any team', () => {
      const { result } = renderPermissionsForRole('admin');

      expect(result.current.canCreateEquipmentForTeam('team-1')).toBe(true);
    });

    it('returns false for member role with no manager/technician membership', () => {
      const { result } = renderPermissionsForRole('member');

      expect(result.current.canCreateEquipmentForTeam('team-1')).toBe(false);
    });
  });

  describe('canCreateEquipmentForAnyTeam (#650)', () => {
    it('returns true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');

      expect(result.current.canCreateEquipmentForAnyTeam()).toBe(true);
    });
  });

  describe('canUpdateEquipmentStatus', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canUpdateEquipmentStatus('team-1')).toBe(true);
    });
  });

  describe('canViewWorkOrder', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canViewWorkOrder()).toBe(true);
    });

    it('should work with work order data', () => {
      const { result } = renderAdminPermissions();

      expect(result.current.canViewWorkOrder(adminSubmittedWorkOrder)).toBe(true);
    });
  });

  describe('canCreateWorkOrder', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canCreateWorkOrder()).toBe(true);
    });
  });

  describe('canAssignWorkOrder', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canAssignWorkOrder()).toBe(true);
    });

    it('should work with work order data', () => {
      const { result } = renderAdminPermissions();

      expect(result.current.canAssignWorkOrder(adminSubmittedWorkOrder)).toBe(true);
    });
  });

  describe('canChangeWorkOrderStatus', () => {
    it('should return true for admin role', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canChangeWorkOrderStatus()).toBe(true);
    });

    it('should work with work order data', () => {
      const { result } = renderAdminPermissions();

      expect(
        result.current.canChangeWorkOrderStatus({
          ...adminSubmittedWorkOrder,
          status: 'in_progress',
        }),
      ).toBe(true);
    });
  });

  describe('Organization Permissions', () => {
    it('canManageOrganization returns true for admin', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManageOrganization()).toBe(true);
    });

    it('canManageOrganization returns false for member', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canManageOrganization()).toBe(false);
    });

    it('canInviteMembers returns true for admin', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canInviteMembers()).toBe(true);
    });

    it('isOrganizationAdmin returns true for admin', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.isOrganizationAdmin()).toBe(true);
    });

    it('isOrganizationAdmin returns false for member', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.isOrganizationAdmin()).toBe(false);
    });
  });

  describe('Inventory Permissions', () => {
    it('canManageInventory returns true for admin without parts manager', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManageInventory(false)).toBe(true);
    });

    it('canManageInventory returns true with parts manager flag', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canManageInventory(true)).toBe(true);
    });

    it('canManagePartsManagers returns true for admin', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManagePartsManagers()).toBe(true);
    });

    it('canManagePartsManagers returns false for member', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canManagePartsManagers()).toBe(false);
    });

    it('canViewInventory returns false for plain member without grants', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canViewInventory(false, false)).toBe(false);
    });

    it('canViewInventory returns true for parts consumer grant', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canViewInventory(false, true)).toBe(true);
    });

    it('canViewInventory returns true for parts manager grant', () => {
      const { result } = renderPermissionsForRole('member');
      
      expect(result.current.canViewInventory(true, false)).toBe(true);
    });

    it('canManagePartsConsumers returns true for admin', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.canManagePartsConsumers()).toBe(true);
    });
  });

  describe('Team Utility Functions', () => {
    it('isTeamMember returns true for team-1', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.isTeamMember('team-1')).toBe(true);
    });

    it('isTeamMember returns false for team-2', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.isTeamMember('team-2')).toBe(false);
    });

    it('isTeamManager returns true for team-1', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.isTeamManager('team-1')).toBe(true);
    });

    it('isTeamManager returns false for team-2', () => {
      const { result } = renderPermissionsForRole('admin');
      
      expect(result.current.isTeamManager('team-2')).toBe(false);
    });
  });
});

describe('useWorkOrderPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return permissions for work order', () => {
    const mockWorkOrder: Partial<WorkOrderData> = {
      teamId: 'team-1',
      assigneeId: 'user-1',
      status: 'submitted',
      createdByName: 'Test User'
    };

    const { result } = renderWorkOrderPermissionsForRole(
      'admin',
      mockWorkOrder as WorkOrderData,
    );
    
    expect(result.current).toBeDefined();
    expect(result.current.canView).toBeDefined();
    expect(result.current.canEdit).toBeDefined();
  });

  it('should work without work order parameter', () => {
    const { result } = renderWorkOrderPermissionsForRole('admin');
    
    expect(result.current).toBeDefined();
  });
});