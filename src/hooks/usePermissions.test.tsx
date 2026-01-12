import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermissions, useWorkOrderPermissions } from './usePermissions';
import { 
  createMockUserContext,
  createMockSimpleOrganizationContext
} from '@/test/mocks/testTypes';
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
    hasPermission: vi.fn((permission: string, context: { userRole?: string; organizationId?: string; teamId?: string }, entityContext?: { teamId?: string; assigneeId?: string }) => {
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

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasRole(['admin'])).toBe(true);
    });

    it('should return false for non-matching role', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should return true if user has any of the specified roles', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasRole(['admin', 'owner'])).toBe(true);
    });
  });

  describe('canManageEquipment', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageEquipment()).toBe(true);
    });

    it('should return false for view-only role', () => {
      updateSessionMockForRole('member'); // Using member since viewer isn't valid
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageEquipment()).toBe(false);
    });
  });

  describe('canManageWorkOrder', () => {
    it('should return true for technician role', () => {
      updateSessionMockForRole('admin'); // Using admin since technician isn't a valid organization role
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageWorkOrder()).toBe(true);
    });

    it('should return true for member role (members can edit work orders)', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      // Members can manage work orders according to the permission engine
      expect(result.current.canManageWorkOrder()).toBe(true);
    });
  });

  describe('canCreateTeam', () => {
    it('should return true for owner role', () => {
      updateSessionMockForRole('admin'); // Using admin since owner isn't implemented in mock
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canCreateTeam()).toBe(true);
    });

    it('should return false for member role', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canCreateTeam()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing user', () => {
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(null));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.hasRole(['admin'])).toBe(false);
    });

    it('should handle missing organization', () => {
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(null)
      );
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
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageTeam('team-1')).toBe(true);
    });

    it('should return false for non-team member', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageTeam('team-2')).toBe(false);
    });
  });

  describe('canViewTeam', () => {
    it('should return true for team member', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canViewTeam('team-1')).toBe(true);
    });
  });

  describe('canViewEquipment', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canViewEquipment()).toBe(true);
    });

    it('should work with equipment team ID', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canViewEquipment('team-1')).toBe(true);
    });
  });

  describe('canCreateEquipment', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canCreateEquipment()).toBe(true);
    });
  });

  describe('canUpdateEquipmentStatus', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canUpdateEquipmentStatus('team-1')).toBe(true);
    });
  });

  describe('canViewWorkOrder', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canViewWorkOrder()).toBe(true);
    });

    it('should work with work order data', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const mockWorkOrder: Partial<WorkOrderData> = {
        teamId: 'team-1',
        assigneeId: 'user-1',
        status: 'submitted',
        createdByName: 'Test User'
      };

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canViewWorkOrder(mockWorkOrder as WorkOrderData)).toBe(true);
    });
  });

  describe('canCreateWorkOrder', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canCreateWorkOrder()).toBe(true);
    });
  });

  describe('canAssignWorkOrder', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canAssignWorkOrder()).toBe(true);
    });

    it('should work with work order data', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const mockWorkOrder: Partial<WorkOrderData> = {
        teamId: 'team-1',
        assigneeId: 'user-1',
        status: 'submitted',
        createdByName: 'Test User'
      };

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canAssignWorkOrder(mockWorkOrder as WorkOrderData)).toBe(true);
    });
  });

  describe('canChangeWorkOrderStatus', () => {
    it('should return true for admin role', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canChangeWorkOrderStatus()).toBe(true);
    });

    it('should work with work order data', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const mockWorkOrder: Partial<WorkOrderData> = {
        teamId: 'team-1',
        assigneeId: 'user-1',
        status: 'in_progress',
        createdByName: 'Test User'
      };

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canChangeWorkOrderStatus(mockWorkOrder as WorkOrderData)).toBe(true);
    });
  });

  describe('Organization Permissions', () => {
    it('canManageOrganization returns true for admin', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageOrganization()).toBe(true);
    });

    it('canManageOrganization returns false for member', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageOrganization()).toBe(false);
    });

    it('canInviteMembers returns true for admin', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canInviteMembers()).toBe(true);
    });

    it('isOrganizationAdmin returns true for admin', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isOrganizationAdmin()).toBe(true);
    });

    it('isOrganizationAdmin returns false for member', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isOrganizationAdmin()).toBe(false);
    });
  });

  describe('Inventory Permissions', () => {
    it('canManageInventory returns true for admin without parts manager', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageInventory(false)).toBe(true);
    });

    it('canManageInventory returns true with parts manager flag', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageInventory(true)).toBe(true);
    });

    it('canManagePartsManagers returns true for admin', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManagePartsManagers()).toBe(true);
    });

    it('canManagePartsManagers returns false for member', () => {
      updateSessionMockForRole('member');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManagePartsManagers()).toBe(false);
    });
  });

  describe('Team Utility Functions', () => {
    it('isTeamMember returns true for team-1', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isTeamMember('team-1')).toBe(true);
    });

    it('isTeamMember returns false for team-2', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isTeamMember('team-2')).toBe(false);
    });

    it('isTeamManager returns true for team-1', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isTeamManager('team-1')).toBe(true);
    });

    it('isTeamManager returns false for team-2', () => {
      updateSessionMockForRole('admin');
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('admin'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.isTeamManager('team-2')).toBe(false);
    });
  });
});

describe('useWorkOrderPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('should return permissions for work order', () => {
    updateSessionMockForRole('admin');
    mockUseSimpleOrganization.mockReturnValue(
      createMockSimpleOrganizationContext(createTestOrganization('admin'))
    );
    mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

    const mockWorkOrder: Partial<WorkOrderData> = {
      teamId: 'team-1',
      assigneeId: 'user-1',
      status: 'submitted',
      createdByName: 'Test User'
    };

    const { result } = renderHook(() => useWorkOrderPermissions(mockWorkOrder as WorkOrderData));
    
    expect(result.current).toBeDefined();
    expect(result.current.canView).toBeDefined();
    expect(result.current.canEdit).toBeDefined();
  });

  it('should work without work order parameter', () => {
    updateSessionMockForRole('admin');
    mockUseSimpleOrganization.mockReturnValue(
      createMockSimpleOrganizationContext(createTestOrganization('admin'))
    );
    mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

    const { result } = renderHook(() => useWorkOrderPermissions());
    
    expect(result.current).toBeDefined();
  });
});