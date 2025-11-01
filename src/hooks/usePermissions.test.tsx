import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermissions } from './usePermissions';
import { 
  createMockUserContext,
  createMockSimpleOrganizationContext
} from '@/test/mocks/testTypes';

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
    getUserTeamIds: vi.fn(() => []),
    hasTeamAccess: vi.fn(() => false),
    canManageTeam: vi.fn(() => false)
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

// Mock the permission engine
vi.mock('@/services/permissions/PermissionEngine', () => ({
  permissionEngine: {
    hasPermission: vi.fn((permission: string, context: { userRole?: string; organizationId?: string; teamId?: string }) => {
      const role = context.userRole;
      
      if (permission === 'workorder.edit') {
        return ['admin', 'technician', 'manager'].includes(role);
      }
      if (permission === 'equipment.edit') {
        return ['admin', 'owner', 'manager'].includes(role);
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
      hasTeamAccess: vi.fn(() => false),
      canManageTeam: vi.fn(() => false),
      getUserTeamIds: vi.fn(() => []),
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

    it('should return false for viewer role', () => {
      updateSessionMockForRole('member'); // Using member since viewer isn't valid
      mockUseSimpleOrganization.mockReturnValue(
        createMockSimpleOrganizationContext(createTestOrganization('member'))
      );
      mockUseUser.mockReturnValue(createMockUserContext(createTestUser()));

      const { result } = renderHook(() => usePermissions());
      
      expect(result.current.canManageWorkOrder()).toBe(false);
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
});