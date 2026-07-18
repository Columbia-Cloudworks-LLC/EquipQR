/**
 * useUnifiedPermissions Hook Tests
 *
 * Tests the unified permissions system that determines what actions
 * users can perform based on their role and team memberships.
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnifiedPermissions } from '../useUnifiedPermissions';
import { personas } from '@/test/fixtures/personas';
import { teams, workOrders } from '@/test/fixtures/entities';
import {
  createUnifiedPermissionsWrapper,
  setupUnifiedPermissionsPersonaMocks,
} from '@/test/utils/unifiedPermissionsTestHarness';

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/permissions/PermissionEngine', () => ({
  permissionEngine: {
    hasPermission: vi.fn(),
    clearCache: vi.fn(),
  },
}));

import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { permissionEngine } from '@/services/permissions/PermissionEngine';

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
        signOut: vi.fn(),
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
        clearSession: vi.fn(),
      });

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.context).toBeNull();
    });

    it('creates user context with correct role and team memberships', () => {
      setupUnifiedPermissionsPersonaMocks('teamManager');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.context).not.toBeNull();
      expect(result.current.context?.userRole).toBe('member');
      expect(result.current.context?.teamMemberships.length).toBeGreaterThan(0);
    });
  });

  describe('Organization Permissions', () => {
    describe('as an Owner', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('owner');
      });

      it('can manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canManage).toBe(true);
      });

      it('can invite members', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canInviteMembers).toBe(true);
      });

      it('can view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canViewBilling).toBe(true);
      });

      it('can manage members', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canManageMembers).toBe(true);
      });
    });

    describe('as an Admin', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('admin');
      });

      it('can manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canManage).toBe(true);
      });

      it('can view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canViewBilling).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('teamManager');
      });

      it('cannot manage organization', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canManage).toBe(false);
      });

      it('cannot view billing', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.organization.canViewBilling).toBe(false);
      });
    });
  });

  describe('Equipment Permissions', () => {
    describe('as an Owner', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('owner');
      });

      it('can create equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateAny).toBe(true);
      });

      it('can delete equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canDelete).toBe(true);
      });

      it('can view all equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canViewAll).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('technician');
      });

      it('cannot create equipment org-wide', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateAny).toBe(false);
      });

      it('can create equipment for their own team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForTeam(teams.maintenance.id)).toBe(true);
      });

      it('cannot create equipment for a different team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForTeam(teams.field.id)).toBe(false);
      });

      it('canCreateForAnyTeam is true (technician on at least one team)', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForAnyTeam).toBe(true);
      });

      it('getPermissions(teamId).canCreate is true for own team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.getPermissions(teams.maintenance.id).canCreate).toBe(true);
      });

      it('can view team equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canView).toBe(true);
      });

      it('cannot edit equipment', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canEdit).toBe(false);
      });
    });

    describe('as a Read-Only Member without team memberships', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('readOnlyMember');
      });

      it('cannot create equipment org-wide', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateAny).toBe(false);
      });

      it('canCreateForAnyTeam is false', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForAnyTeam).toBe(false);
      });

      it('cannot create equipment for any specific team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForTeam(teams.maintenance.id)).toBe(false);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('teamManager');
      });

      it('cannot create equipment org-wide', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateAny).toBe(false);
      });

      it('can create equipment for their own team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForTeam(teams.maintenance.id)).toBe(true);
      });

      it('cannot create equipment for a team they do not belong to', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForTeam(teams.field.id)).toBe(false);
      });

      it('canCreateForAnyTeam is true', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.equipment.canCreateForAnyTeam).toBe(true);
      });
    });
  });

  describe('Work Order Permissions', () => {
    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('teamManager');
      });

      it('can assign work orders in their team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.maintenance.id,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(true);
      });

      it('can change status of team work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.maintenance.id,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canChangeStatus).toBe(true);
      });

      it('cannot assign work orders from other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.inProgress,
          teamId: teams.field.id,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(false);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('technician');
      });

      it('can edit assigned work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.assigned,
          teamId: teams.maintenance.id,
          assigneeId: personas.technician.id,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canEdit).toBe(true);
      });

      it('cannot assign work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.assigned,
          teamId: teams.maintenance.id,
          assigneeId: personas.technician.id,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canAssign).toBe(false);
      });

      it('cannot view unassigned work orders from other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const mockWorkOrder = {
          ...workOrders.submitted,
          teamId: teams.field.id,
          assigneeId: null,
        };

        const permissions = result.current.workOrders.getPermissions(mockWorkOrder as never);
        expect(permissions.canView).toBe(false);
      });
    });

    describe('Detailed Work Order Permissions', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('teamManager');
      });

      it('cannot edit completed work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const completedWorkOrder = {
          ...workOrders.completed,
          teamId: teams.maintenance.id,
          status: 'completed' as const,
        };

        const permissions = result.current.workOrders.getDetailedPermissions(completedWorkOrder as never);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canEditPriority).toBe(false);
        expect(permissions.canAddNotes).toBe(true);
        expect(permissions.canAddImages).toBe(true);
      });

      it('cannot edit cancelled work orders', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const cancelledWorkOrder = {
          ...workOrders.cancelled,
          teamId: teams.maintenance.id,
          status: 'cancelled' as const,
        };

        const permissions = result.current.workOrders.getDetailedPermissions(cancelledWorkOrder as never);
        expect(permissions.canEdit).toBe(false);
        expect(permissions.canAddNotes).toBe(false);
        expect(permissions.canAddImages).toBe(false);
      });

      it('can still change status on completed work orders (for reopening)', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const completedWorkOrder = {
          ...workOrders.completed,
          teamId: teams.maintenance.id,
          status: 'completed' as const,
        };

        const permissions = result.current.workOrders.getDetailedPermissions(completedWorkOrder as never);
        expect(permissions.canChangeStatus).toBe(true);
      });
    });
  });

  describe('Team Permissions', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('admin');
      });

      it('can create teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.teams.canCreateAny).toBe(true);
      });

      it('can view all teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.teams.canViewAll).toBe(true);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('teamManager');
      });

      it('cannot create new teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.teams.canCreateAny).toBe(false);
      });

      it('can manage their own team', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.teams.getPermissions(teams.maintenance.id);
        expect(permissions.canEdit).toBe(true);
      });

      it('cannot manage other teams', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.teams.getPermissions(teams.field.id);
        expect(permissions.canEdit).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      setupUnifiedPermissionsPersonaMocks('technician');
    });

    it('hasRole returns true for matching role', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.hasRole('member')).toBe(true);
    });

    it('hasRole returns false for non-matching role', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.hasRole('owner')).toBe(false);
    });

    it('hasRole accepts array of roles', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.hasRole(['owner', 'admin', 'member'])).toBe(true);
      expect(result.current.hasRole(['owner', 'admin'])).toBe(false);
    });

    it('isTeamMember returns true for team membership', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.isTeamMember(teams.maintenance.id)).toBe(true);
    });

    it('isTeamMember returns false for non-membership', () => {
      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.isTeamMember(teams.field.id)).toBe(false);
    });

    it('isTeamManager returns correct value', () => {
      setupUnifiedPermissionsPersonaMocks('teamManager');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      expect(result.current.isTeamManager(teams.maintenance.id)).toBe(true);
      expect(result.current.isTeamManager(teams.field.id)).toBe(false);
    });
  });

  describe('Inventory Permissions', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('admin');
      });

      it('can view inventory without extra grants', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.inventory.canViewAny(false, false)).toBe(true);
        expect(result.current.inventory.getPermissions(false, false).canView).toBe(true);
      });

      it('can manage inventory without parts manager grant', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.inventory.canManageAny(false)).toBe(true);
        expect(result.current.inventory.getPermissions(false, false).canCreate).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('technician');
      });

      it('cannot view inventory by default', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        expect(result.current.inventory.canViewAny(false, false)).toBe(false);
        expect(result.current.inventory.getPermissions(false, false).canView).toBe(false);
      });

      it('can view inventory as parts consumer only', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.inventory.getPermissions(false, true);
        expect(permissions.canView).toBe(true);
        expect(permissions.canCreate).toBe(false);
        expect(permissions.canEdit).toBe(false);
      });

      it('can manage inventory when parts manager grant is present', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.inventory.getPermissions(true, false);
        expect(permissions.canView).toBe(true);
        expect(permissions.canCreate).toBe(true);
        expect(permissions.canEdit).toBe(true);
      });
    });
  });

  describe('Equipment Notes Permissions', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('admin');
      });

      it('can add private notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canAddPrivateNote).toBe(true);
      });

      it('can delete any note', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canDeleteAnyNote).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        setupUnifiedPermissionsPersonaMocks('technician');
      });

      it('can add public notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canAddPublicNote).toBe(true);
      });

      it('can only edit own notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);

        expect(permissions.canEditOwnNote({ author_id: personas.technician.id })).toBe(true);
        expect(permissions.canEditOwnNote({ author_id: 'other-user-id' })).toBe(false);
      });

      it('cannot delete others notes', () => {
        const { result } = renderHook(() => useUnifiedPermissions(), {
          wrapper: createUnifiedPermissionsWrapper(),
        });

        const permissions = result.current.getEquipmentNotesPermissions(teams.maintenance.id);
        expect(permissions.canDeleteAnyNote).toBe(false);
      });
    });
  });

  describe('Cache Management', () => {
    it('can clear permission cache', () => {
      setupUnifiedPermissionsPersonaMocks('admin');

      const { result } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      result.current.clearPermissionCache();

      expect(permissionEngine.clearCache).toHaveBeenCalled();
    });
  });

  describe('Referential stability', () => {
    it('keeps permission domain objects and return value stable across re-renders', () => {
      setupUnifiedPermissionsPersonaMocks('admin');

      const { result, rerender } = renderHook(() => useUnifiedPermissions(), {
        wrapper: createUnifiedPermissionsWrapper(),
      });

      const first = result.current;
      rerender();
      const second = result.current;

      expect(second).toBe(first);
      expect(second.organization).toBe(first.organization);
      expect(second.equipment).toBe(first.equipment);
      expect(second.workOrders).toBe(first.workOrders);
      expect(second.teams).toBe(first.teams);
      expect(second.inventory).toBe(first.inventory);
      expect(second.getEquipmentNotesPermissions).toBe(first.getEquipmentNotesPermissions);
    });
  });
});
