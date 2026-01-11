/**
 * useUnifiedPermissions Hook Tests
 * 
 * Tests the unified permissions system that determines what actions
 * users can perform based on their role and team memberships.
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useUnifiedPermissions } from '../useUnifiedPermissions';
import { personas } from '@/test/fixtures/personas';
import { teams, workOrders, organizations } from '@/test/fixtures/entities';
import type { Role, TeamRole } from '@/types/permissions';

// Mock the session and auth hooks
vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn()
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock the permission engine
vi.mock('@/services/permissions/PermissionEngine', () => ({
  permissionEngine: {
    hasPermission: vi.fn(),
    clearCache: vi.fn()
  }
}));

import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Helper to setup mocks for a specific persona
const setupPersonaMocks = (personaKey: keyof typeof personas) => {
  const persona = personas[personaKey];
  
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: persona.id,
      email: persona.email,
      user_metadata: { full_name: persona.name }
    },
    session: { user: { id: persona.id } },
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn()
  });

  vi.mocked(useSession).mockReturnValue({
    sessionData: {
      user: { id: persona.id, email: persona.email },
      organizations: [{
        id: organizations.acme.id,
        name: organizations.acme.name,
        plan: organizations.acme.plan,
        memberCount: organizations.acme.memberCount,
        maxMembers: organizations.acme.maxMembers,
        features: organizations.acme.features,
        userRole: persona.organizationRole,
        userStatus: 'active'
      }],
      teamMemberships: persona.teamMemberships,
      currentOrganizationId: organizations.acme.id,
      lastUpdated: new Date().toISOString(),
      version: 1
    },
    isLoading: false,
    error: null,
    getCurrentOrganization: () => ({
      id: organizations.acme.id,
      name: organizations.acme.name,
      plan: organizations.acme.plan,
      memberCount: organizations.acme.memberCount,
      maxMembers: organizations.acme.maxMembers,
      features: organizations.acme.features,
      userRole: persona.organizationRole,
      userStatus: 'active'
    }),
    switchOrganization: vi.fn(),
    hasTeamRole: (teamId: string, role: string) => {
      const membership = persona.teamMemberships.find(tm => tm.teamId === teamId);
      return membership?.role === role;
    },
    hasTeamAccess: (teamId: string) => {
      return persona.teamMemberships.some(tm => tm.teamId === teamId);
    },
    canManageTeam: (teamId: string) => {
      const membership = persona.teamMemberships.find(tm => tm.teamId === teamId);
      return membership?.role === 'manager' ||
             persona.organizationRole === 'owner' ||
             persona.organizationRole === 'admin';
    },
    getUserTeamIds: () => persona.teamMemberships.map(tm => tm.teamId),
    refreshSession: vi.fn(),
    clearSession: vi.fn()
  });

  // Setup permission engine mock based on persona role
  vi.mocked(permissionEngine.hasPermission).mockImplementation(
    (permission: string, userContext, entityContext) => {
      const role = persona.organizationRole;
      
      // Owners and admins have most permissions
      if (role === 'owner' || role === 'admin') {
        return true;
      }

      // Members have limited permissions based on team membership
      if (role === 'member') {
        const teamId = entityContext?.teamId;
        const assigneeId = entityContext?.assigneeId;
        
        // Check if user has team access
        const hasTeamAccess = persona.teamMemberships.some(tm => tm.teamId === teamId);
        const isAssigned = assigneeId === persona.id;
        const isManager = persona.teamMemberships.some(
          tm => tm.teamId === teamId && tm.role === 'manager'
        );

        if (permission.startsWith('workorder.')) {
          if (permission === 'workorder.view') return hasTeamAccess || isAssigned;
          if (permission === 'workorder.edit') return isAssigned || isManager;
          if (permission === 'workorder.assign') return isManager;
          if (permission === 'workorder.changestatus') return isAssigned || isManager;
        }

        if (permission.startsWith('equipment.')) {
          if (permission === 'equipment.view') return hasTeamAccess;
          if (permission === 'equipment.edit') return isManager;
        }

        if (permission.startsWith('team.')) {
          if (permission === 'team.view') return hasTeamAccess;
          if (permission === 'team.manage') return isManager;
        }

        return false;
      }

      // Viewers have very limited permissions
      if (role === 'viewer') {
        return permission.includes('.view');
      }

      return false;
    }
  );
};

describe('useUnifiedPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Context', () => {
    it('returns null context when no user is authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signInWithGoogle: vi.fn(),
        signOut: vi.fn()
      });

      vi.mocked(useSession).mockReturnValue({
        sessionData: null,
        isLoading: false,
        error: null,
        getCurrentOrganization: () => null,
        switchOrganization: vi.fn(),
        hasTeamRole: () => false,
        hasTeamAccess: () => false,
        canManageTeam: () => false,
        getUserTeamIds: () => [],
        refreshSession: vi.fn(),
        clearSession: vi.fn()
      });

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.context).toBeNull();
    });

    it('creates user context with correct role and team memberships', () => {
      setupPersonaMocks('teamManager');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.context).not.toBeNull();
      expect(result.current.context?.userRole).toBe('member');
      expect(result.current.context?.teamMemberships.length).toBeGreaterThan(0);
    });
  });

  describe('Organization Permissions', () => {
    describe('as an Owner', () => {
      beforeEach(() => {
        setupPersonaMocks('owner');
      });

      it('can manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canManage).toBe(true);
      });

      it('can invite members', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canInviteMembers).toBe(true);
      });

      it('can view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canViewBilling).toBe(true);
      });

      it('can manage members', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canManageMembers).toBe(true);
      });
    });

    describe('as an Admin', () => {
      beforeEach(() => {
        setupPersonaMocks('admin');
      });

      it('can manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canManage).toBe(true);
      });

      it('can view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canViewBilling).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupPersonaMocks('teamManager');
      });

      it('cannot manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canManage).toBe(false);
      });

      it('cannot view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.organization.canViewBilling).toBe(false);
      });
    });
  });

  describe('Equipment Permissions', () => {
    describe('as an Owner', () => {
      beforeEach(() => {
        setupPersonaMocks('owner');
      });

      it('can create equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.equipment.canCreateAny).toBe(true);
      });

      it('can delete equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canDelete).toBe(true);
      });

      it('can view all equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.equipment.canViewAll).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupPersonaMocks('technician');
      });

      it('cannot create equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.equipment.canCreateAny).toBe(false);
      });

      it('can view team equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canView).toBe(true);
      });

      it('cannot edit equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canEdit).toBe(false);
      });
    });
  });

  describe('Work Order Permissions', () => {
    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupPersonaMocks('teamManager');
      });

      it('can assign work orders in their team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.maintenance.id
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(true);
      });

      it('can change status of team work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.maintenance.id
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canChangeStatus).toBe(true);
      });

      it('cannot assign work orders from other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.inProgress,
          teamId: teams.field.id // Different team
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(false);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupPersonaMocks('technician');
      });

      it('can edit assigned work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.assigned,
          teamId: teams.maintenance.id,
          assigneeId: personas.technician.id
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canEdit).toBe(true);
      });

      it('cannot assign work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.assigned,
          teamId: teams.maintenance.id,
          assigneeId: personas.technician.id
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(false);
      });

      it('cannot view unassigned work orders from other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.field.id,
          assigneeId: null
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canView).toBe(false);
      });
    });

    describe('Detailed Work Order Permissions', () => {
      beforeEach(() => {
        setupPersonaMocks('teamManager');
      });

      it('cannot edit completed work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const completedWorkOrder = {
          ...workOrders.completed,
          teamId: teams.maintenance.id,
          status: 'completed' as const
        };

        const permissions = result.current.workOrders.getDetailedPermissions(completedWorkOrder as never);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canEditPriority).toBe(false);
        expect(permissions.canAddNotes).toBe(false);
      });

      it('cannot edit cancelled work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const cancelledWorkOrder = {
          ...workOrders.cancelled,
          teamId: teams.maintenance.id,
          status: 'cancelled' as const
        };

        const permissions = result.current.workOrders.getDetailedPermissions(cancelledWorkOrder as never);
        expect(permissions.canEdit).toBe(false);
      });

      it('can still change status on completed work orders (for reopening)', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const completedWorkOrder = {
          ...workOrders.completed,
          teamId: teams.maintenance.id,
          status: 'completed' as const
        };

        const permissions = result.current.workOrders.getDetailedPermissions(completedWorkOrder as never);
        expect(permissions.canChangeStatus).toBe(true);
      });
    });
  });

  describe('Team Permissions', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        setupPersonaMocks('admin');
      });

      it('can create teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.teams.canCreateAny).toBe(true);
      });

      it('can view all teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.teams.canViewAll).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupPersonaMocks('teamManager');
      });

      it('cannot create new teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        expect(result.current.teams.canCreateAny).toBe(false);
      });

      it('can manage their own team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.teams.getPermissions(teams.maintenance.id);
        expect(permissions.canEdit).toBe(true);
      });

      it('cannot manage other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.teams.getPermissions(teams.field.id);
        expect(permissions.canEdit).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      setupPersonaMocks('technician');
    });

    it('hasRole returns true for matching role', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.hasRole('member')).toBe(true);
    });

    it('hasRole returns false for non-matching role', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.hasRole('owner')).toBe(false);
    });

    it('hasRole accepts array of roles', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.hasRole(['owner', 'admin', 'member'])).toBe(true);
      expect(result.current.hasRole(['owner', 'admin'])).toBe(false);
    });

    it('isTeamMember returns true for team membership', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.isTeamMember(teams.maintenance.id)).toBe(true);
    });

    it('isTeamMember returns false for non-membership', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.isTeamMember(teams.field.id)).toBe(false);
    });

    it('isTeamManager returns correct value', () => {
      setupPersonaMocks('teamManager');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      expect(result.current.isTeamManager(teams.maintenance.id)).toBe(true);
      expect(result.current.isTeamManager(teams.field.id)).toBe(false);
    });
  });

  describe('Equipment Notes Permissions', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        setupPersonaMocks('admin');
      });

      it('can add private notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canAddPrivateNote).toBe(true);
      });

      it('can delete any note', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canDeleteAnyNote).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupPersonaMocks('technician');
      });

      it('can add public notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canAddPublicNote).toBe(true);
      });

      it('can only edit own notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        
        // Can edit own note
        expect(permissions.canEditOwnNote({ author_id: personas.technician.id })).toBe(true);
        
        // Cannot edit others' notes
        expect(permissions.canEditOwnNote({ author_id: 'other-user-id' })).toBe(false);
      });

      it('cannot delete others notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createWrapper()
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canDeleteAnyNote).toBe(false);
      });
    });
  });

  describe('Cache Management', () => {
    it('can clear permission cache', () => {
      setupPersonaMocks('admin');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createWrapper()
      });

      result.current.clearPermissionCache();
      
      expect(permissionEngine.clearCache).toHaveBeenCalled();
    });
  });
});
