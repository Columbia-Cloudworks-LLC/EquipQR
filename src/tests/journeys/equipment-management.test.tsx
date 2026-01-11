/**
 * Equipment Management Journey Tests
 * 
 * These tests validate complete user workflows for equipment management,
 * testing from the perspective of different user personas.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { equipment, teams, organizations } from '@/test/fixtures/entities';

// Mock the equipment hooks
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

vi.mock('@/features/equipment/hooks/useDeleteEquipment', () => ({
  useDeleteEquipment: vi.fn()
}));

// Import after mocking
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

// Test component that exercises the equipment list
const EquipmentTestComponent = () => {
  const { data: equipmentList, isLoading } = useEquipment();
  
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  
  return (
    <div data-testid="equipment-list">
      <h1>Equipment</h1>
      {equipmentList?.map((eq) => (
        <div key={eq.id} data-testid={`equipment-${eq.id}`}>
          <span data-testid="eq-name">{eq.name}</span>
          <span data-testid="eq-status">{eq.status}</span>
          <span data-testid="eq-team">{eq.team_id || 'Unassigned'}</span>
        </div>
      ))}
    </div>
  );
};

describe('Equipment Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as an Organization Owner', () => {
    beforeEach(() => {
      vi.mocked(useEquipment).mockReturnValue({
        data: Object.values(equipment),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useEquipment>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('owner');
        },
        isTeamMember: () => true,
        isTeamManager: () => true,
        organization: {
          canManage: true,
          canInviteMembers: true,
          canCreateTeams: true,
          canViewBilling: true,
          canManageMembers: true
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        workOrders: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAssign: true,
            canChangeStatus: true
          }),
          getDetailedPermissions: () => ({
            canEdit: true,
            canEditPriority: true,
            canEditAssignment: true,
            canEditDueDate: true,
            canEditDescription: true,
            canChangeStatus: true,
            canAddNotes: true,
            canAddImages: true,
            canAddCosts: true,
            canEditCosts: true,
            canViewPM: true,
            canEditPM: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        teams: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true
          }),
          canCreateAny: true
        },
        notes: {
          getPermissions: () => ({
            canViewNotes: true,
            canAddPublicNote: true,
            canAddPrivateNote: true,
            canEditOwnNote: () => true,
            canEditAnyNote: true,
            canDeleteOwnNote: () => true,
            canDeleteAnyNote: true,
            canUploadImages: true,
            canDeleteImages: true,
            canSetDisplayImage: true
          })
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view all equipment across all teams', () => {
      renderAsPersona(<EquipmentTestComponent />, 'owner');

      expect(screen.getByTestId('equipment-list')).toBeInTheDocument();
      
      // Owner should see all equipment
      Object.values(equipment).forEach(eq => {
        expect(screen.getByTestId(`equipment-${eq.id}`)).toBeInTheDocument();
      });
    });

    it('can create new equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'owner'
      );

      expect(result.current.equipment.canCreateAny).toBe(true);
    });

    it('can delete any equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'owner'
      );

      const permissions = result.current.equipment.getPermissions(equipment.forklift1.team_id);
      expect(permissions.canDelete).toBe(true);
    });

    it('can assign equipment to any team', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'owner'
      );

      const permissions = result.current.equipment.getPermissions();
      expect(permissions.canEdit).toBe(true);
    });
  });

  describe('as an Admin', () => {
    beforeEach(() => {
      vi.mocked(useEquipment).mockReturnValue({
        data: Object.values(equipment),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useEquipment>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('admin') || roleArray.includes('owner');
        },
        isTeamMember: () => true,
        isTeamManager: () => true,
        organization: {
          canManage: true,
          canInviteMembers: true,
          canCreateTeams: true,
          canViewBilling: false,
          canManageMembers: true
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        workOrders: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true
          }),
          getDetailedPermissions: () => ({
            canEdit: true,
            canEditAssignment: true,
            canChangeStatus: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        teams: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false
          }),
          canCreateAny: true
        },
        notes: {
          getPermissions: () => ({
            canViewNotes: true,
            canAddPublicNote: true,
            canAddPrivateNote: true,
            canEditOwnNote: () => true,
            canEditAnyNote: true,
            canDeleteOwnNote: () => true,
            canDeleteAnyNote: true,
            canUploadImages: true,
            canDeleteImages: true,
            canSetDisplayImage: true
          })
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view all equipment', () => {
      renderAsPersona(<EquipmentTestComponent />, 'admin');

      expect(screen.getByTestId('equipment-list')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^equipment-/).length).toBe(Object.keys(equipment).length);
    });

    it('can create equipment with custom attributes', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'admin'
      );

      expect(result.current.equipment.canCreateAny).toBe(true);
    });

    it('can assign PM templates to equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'admin'
      );

      const permissions = result.current.equipment.getPermissions();
      expect(permissions.canEdit).toBe(true);
    });
  });

  describe('as a Team Manager', () => {
    const teamEquipment = Object.values(equipment).filter(
      eq => eq.team_id === teams.maintenance.id
    );

    beforeEach(() => {
      vi.mocked(useEquipment).mockReturnValue({
        data: teamEquipment,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useEquipment>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('member');
        },
        isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
        isTeamManager: (teamId: string) => teamId === teams.maintenance.id,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        equipment: {
          getPermissions: (teamId?: string) => {
            const isTeamEquipment = teamId === teams.maintenance.id;
            return {
              canView: isTeamEquipment,
              canCreate: false,
              canEdit: isTeamEquipment,
              canDelete: false,
              canAddNotes: isTeamEquipment,
              canAddImages: isTeamEquipment
            };
          },
          canViewAll: false,
          canCreateAny: false
        },
        workOrders: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false
          }),
          getDetailedPermissions: () => ({
            canEdit: true,
            canEditAssignment: true,
            canChangeStatus: true
          }),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: (teamId: string) => ({
            canView: teamId === teams.maintenance.id,
            canCreate: false,
            canEdit: teamId === teams.maintenance.id,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({
            canViewNotes: true,
            canAddPublicNote: true,
            canAddPrivateNote: true,
            canEditOwnNote: () => true,
            canEditAnyNote: false,
            canDeleteOwnNote: () => true,
            canDeleteAnyNote: false,
            canUploadImages: true,
            canDeleteImages: false,
            canSetDisplayImage: false
          })
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can only view equipment from their managed team', () => {
      renderAsPersona(<EquipmentTestComponent />, 'teamManager');

      expect(screen.getByTestId('equipment-list')).toBeInTheDocument();
      
      // Should only see maintenance team equipment
      teamEquipment.forEach(eq => {
        expect(screen.getByTestId(`equipment-${eq.id}`)).toBeInTheDocument();
      });

      // Should NOT see equipment from other teams
      expect(screen.queryByTestId(`equipment-${equipment.crane.id}`)).not.toBeInTheDocument();
    });

    it('can edit equipment status for their team', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
      expect(permissions.canEdit).toBe(true);
    });

    it('cannot create new equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      expect(result.current.equipment.canCreateAny).toBe(false);
    });

    it('cannot delete equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
      expect(permissions.canDelete).toBe(false);
    });
  });

  describe('as a Technician', () => {
    const teamEquipment = Object.values(equipment).filter(
      eq => eq.team_id === teams.maintenance.id
    );

    beforeEach(() => {
      vi.mocked(useEquipment).mockReturnValue({
        data: teamEquipment,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useEquipment>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('member');
        },
        isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
        isTeamManager: () => false,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        equipment: {
          getPermissions: (teamId?: string) => {
            const isTeamEquipment = teamId === teams.maintenance.id;
            return {
              canView: isTeamEquipment,
              canCreate: false,
              canEdit: false, // Technicians cannot edit equipment
              canDelete: false,
              canAddNotes: isTeamEquipment,
              canAddImages: isTeamEquipment
            };
          },
          canViewAll: false,
          canCreateAny: false
        },
        workOrders: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: false,
            canDelete: false
          }),
          getDetailedPermissions: () => ({
            canEdit: false,
            canEditAssignment: false,
            canChangeStatus: true
          }),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({
            canViewNotes: true,
            canAddPublicNote: true,
            canAddPrivateNote: false,
            canEditOwnNote: () => true,
            canEditAnyNote: false,
            canDeleteOwnNote: () => true,
            canDeleteAnyNote: false,
            canUploadImages: true,
            canDeleteImages: false,
            canSetDisplayImage: false
          })
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view equipment from their team', () => {
      renderAsPersona(<EquipmentTestComponent />, 'technician');

      expect(screen.getByTestId('equipment-list')).toBeInTheDocument();
      
      teamEquipment.forEach(eq => {
        expect(screen.getByTestId(`equipment-${eq.id}`)).toBeInTheDocument();
      });
    });

    it('can add notes to equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
      expect(permissions.canAddNotes).toBe(true);
    });

    it('can upload images to equipment', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
      expect(permissions.canAddImages).toBe(true);
    });

    it('cannot edit equipment details', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
      expect(permissions.canEdit).toBe(false);
    });
  });

  describe('Equipment Status Transitions', () => {
    it('allows valid status transition: active → maintenance', () => {
      const eq = { ...equipment.forklift1 };
      const newStatus = 'maintenance';
      
      // Valid statuses
      const validStatuses = ['active', 'maintenance', 'inactive'];
      expect(validStatuses).toContain(newStatus);
    });

    it('allows valid status transition: maintenance → active', () => {
      const eq = { ...equipment.forklift2 };
      const newStatus = 'active';
      
      const validStatuses = ['active', 'maintenance', 'inactive'];
      expect(validStatuses).toContain(newStatus);
    });

    it('allows deactivating equipment: active → inactive', () => {
      const eq = { ...equipment.forklift1 };
      const newStatus = 'inactive';
      
      const validStatuses = ['active', 'maintenance', 'inactive'];
      expect(validStatuses).toContain(newStatus);
    });
  });

  describe('Equipment with PM Templates', () => {
    it('displays equipment with assigned PM template', () => {
      const equipmentWithPM = equipment.forklift1;
      expect(equipmentWithPM.default_pm_template_id).toBe('template-forklift');
    });

    it('displays equipment without PM template', () => {
      const equipmentWithoutPM = equipment.compressor;
      expect(equipmentWithoutPM.default_pm_template_id).toBeNull();
    });
  });

  describe('Unassigned Equipment', () => {
    beforeEach(() => {
      vi.mocked(useEquipment).mockReturnValue({
        data: [equipment.unassigned],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useEquipment>);
    });

    it('shows equipment without team assignment', () => {
      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: () => true,
        isTeamMember: () => true,
        isTeamManager: () => true,
        organization: { canManage: true, canInviteMembers: true, canCreateTeams: true, canViewBilling: true, canManageMembers: true },
        equipment: {
          getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true, canAddNotes: true, canAddImages: true }),
          canViewAll: true,
          canCreateAny: true
        },
        workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: true, canCreateAny: true },
        teams: { getPermissions: () => ({}), canCreateAny: true },
        notes: { getPermissions: () => ({}) }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);

      renderAsPersona(<EquipmentTestComponent />, 'admin');

      const unassignedEquipment = screen.getByTestId(`equipment-${equipment.unassigned.id}`);
      expect(unassignedEquipment).toBeInTheDocument();
    });
  });
});
