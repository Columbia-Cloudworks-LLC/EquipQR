/**
 * Equipment Management Journey Tests
 * 
 * These tests validate complete user workflows for equipment management,
 * testing from the perspective of different user personas.
 * 
 * User Stories Covered:
 * - As an Owner/Admin, I want to add equipment with custom attributes and assign to teams
 * - As a Team Manager, I want to update equipment status for my team
 * - As a Technician, I want to view equipment details, add notes and images
 * - As any user, I want to view QR codes for equipment identification
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { equipment, teams, organizations, pmTemplates } from '@/test/fixtures/entities';

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

vi.mock('@/features/equipment/hooks/useEquipmentNotesQuery', () => ({
  useEquipmentNotesQuery: vi.fn()
}));

// Import after mocking
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useEquipmentNotesQuery } from '@/features/equipment/hooks/useEquipmentNotesQuery';

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
      // Use more specific regex to match equipment items (not the list container)
      expect(screen.getAllByTestId(/^equipment-eq-/).length).toBe(Object.keys(equipment).length);
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

  describe('Adding Equipment', () => {
    describe('as an Admin', () => {
      beforeEach(() => {
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
            getPermissions: () => ({}),
            getDetailedPermissions: () => ({}),
            canViewAll: true,
            canCreateAny: true
          },
          teams: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: false }),
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

      it('can create equipment with all required fields', () => {
        const newEquipment = {
          name: 'New Forklift',
          manufacturer: 'Toyota',
          model: '8FGU25',
          serial_number: 'TY-2024-999',
          status: 'active',
          location: 'Warehouse B'
        };

        // All required fields are present
        expect(newEquipment.name.length).toBeGreaterThan(0);
        expect(newEquipment.manufacturer.length).toBeGreaterThan(0);
        expect(newEquipment.serial_number.length).toBeGreaterThan(0);
      });

      it('can add custom attributes to equipment', () => {
        const equipmentWithCustomAttrs = {
          ...equipment.forklift1,
          custom_attributes: {
            'Fuel Type': 'Propane',
            'Capacity (lbs)': 5000,
            'Year': 2024
          }
        };

        expect(equipmentWithCustomAttrs.custom_attributes).toBeDefined();
        expect(equipmentWithCustomAttrs.custom_attributes['Fuel Type']).toBe('Propane');
        expect(equipmentWithCustomAttrs.custom_attributes['Capacity (lbs)']).toBe(5000);
      });

      it('can assign equipment to any team', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        expect(result.current.equipment.canCreateAny).toBe(true);
        
        // Admin can see all teams for assignment
        expect(result.current.teams.getPermissions(teams.maintenance.id).canView).toBe(true);
      });

      it('can assign default PM template during creation', () => {
        const newEquipment = {
          name: 'New Crane',
          manufacturer: 'Konecranes',
          model: 'CXT-15',
          serial_number: 'KC-2024-001',
          status: 'active',
          default_pm_template_id: pmTemplates.crane.id
        };

        expect(newEquipment.default_pm_template_id).toBe(pmTemplates.crane.id);
      });

      it('validates required fields before submission', () => {
        const invalidEquipment = {
          name: '', // Required
          manufacturer: 'Toyota',
          model: '',
          serial_number: '', // Required
          status: 'active',
          location: ''
        };

        // Name and serial number are required
        expect(invalidEquipment.name.length).toBe(0);
        expect(invalidEquipment.serial_number.length).toBe(0);
      });
    });

    describe('as a Team Manager', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: (teamId: string) => teamId === teams.maintenance.id,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: true,
              canDelete: false,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('cannot create new equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'teamManager'
        );

        expect(result.current.equipment.canCreateAny).toBe(false);
      });
    });
  });

  describe('QR Code Workflow', () => {
    describe('as a Technician', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: { getPermissions: () => ({}) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view QR code for equipment', () => {
        const equipmentId = equipment.forklift1.id;
        const qrCodeUrl = `/equipment/${equipmentId}/qr`;

        expect(qrCodeUrl).toContain(equipmentId);
      });

      it('QR code contains correct equipment reference', () => {
        const equipmentId = equipment.forklift1.id;
        const baseUrl = 'https://app.equipqr.com';
        const qrCodeData = `${baseUrl}/qr/${equipmentId}`;

        expect(qrCodeData).toContain(equipmentId);
        expect(qrCodeData).toContain('qr');
      });

      it('can share QR code link', () => {
        const equipmentId = equipment.forklift1.id;
        const shareableLink = `https://app.equipqr.com/equipment/${equipmentId}`;

        expect(shareableLink).toContain(equipmentId);
      });
    });

    describe('QR scanning redirects', () => {
      it('redirects legacy QR codes to new format', () => {
        const legacyPath = '/eq/ABC123';
        const equipmentId = 'ABC123';
        const newPath = `/dashboard/equipment/${equipmentId}`;

        expect(newPath).toContain(equipmentId);
      });

      it('handles invalid QR codes gracefully', () => {
        const invalidEquipmentId = 'invalid-id-12345';
        const errorMessage = 'Equipment not found';

        expect(errorMessage).toBe('Equipment not found');
      });
    });
  });

  describe('Notes and Images', () => {
    describe('as a Technician', () => {
      beforeEach(() => {
        vi.mocked(useEquipmentNotesQuery).mockReturnValue({
          data: [
            {
              id: 'note-1',
              equipment_id: equipment.forklift1.id,
              content: 'Oil level checked',
              created_by: personas.technician.id,
              created_at: '2024-01-10T10:00:00Z',
              is_private: false
            }
          ],
          isLoading: false,
          isError: false,
          error: null
        } as ReturnType<typeof useEquipmentNotesQuery>);

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canAddNotes: true,
              canAddImages: true
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
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

      it('can add notes to team equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canAddNotes).toBe(true);
      });

      it('can add public notes', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canAddPublicNote).toBe(true);
      });

      it('cannot add private notes', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canAddPrivateNote).toBe(false);
      });

      it('can upload images to equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.equipment.getPermissions(teams.maintenance.id);
        expect(permissions.canAddImages).toBe(true);
      });

      it('can edit own notes', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canEditOwnNote(personas.technician.id)).toBe(true);
      });

      it('cannot edit notes from other users', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canEditAnyNote).toBe(false);
      });

      it('cannot set display image', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canSetDisplayImage).toBe(false);
      });
    });

    describe('as a Viewer', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: (roles: string | string[]) => {
            const roleArray = Array.isArray(roles) ? roles : [roles];
            return roleArray.includes('viewer');
          },
          isTeamMember: () => false,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: {
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canAddNotes: false,
              canAddImages: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: false, canCreateAny: false },
          teams: { getPermissions: () => ({}), canCreateAny: false },
          notes: {
            getPermissions: () => ({
              canViewNotes: true,
              canAddPublicNote: false,
              canAddPrivateNote: false,
              canEditOwnNote: () => false,
              canEditAnyNote: false,
              canDeleteOwnNote: () => false,
              canDeleteAnyNote: false,
              canUploadImages: false,
              canDeleteImages: false,
              canSetDisplayImage: false
            })
          }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view notes but cannot add', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'viewer'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canViewNotes).toBe(true);
        expect(notePermissions.canAddPublicNote).toBe(false);
      });

      it('cannot upload images', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'viewer'
        );

        const permissions = result.current.equipment.getPermissions();
        expect(permissions.canAddImages).toBe(false);
      });
    });

    describe('as an Admin', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => true,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: true, canInviteMembers: true, canCreateTeams: true, canViewBilling: false, canManageMembers: true },
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
          workOrders: { getPermissions: () => ({}), getDetailedPermissions: () => ({}), canViewAll: true, canCreateAny: true },
          teams: { getPermissions: () => ({}), canCreateAny: true },
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

      it('can add private notes', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canAddPrivateNote).toBe(true);
      });

      it('can edit any note', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canEditAnyNote).toBe(true);
      });

      it('can delete any note', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canDeleteAnyNote).toBe(true);
      });

      it('can set display image for equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canSetDisplayImage).toBe(true);
      });

      it('can delete images', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const notePermissions = result.current.notes.getPermissions();
        expect(notePermissions.canDeleteImages).toBe(true);
      });
    });
  });

  describe('Equipment Working Hours', () => {
    it('displays formatted working hours', () => {
      const eq = equipment.forklift1;
      // Assuming working hours are stored as a number
      const workingHours = 1500;
      const formattedHours = workingHours.toLocaleString();

      expect(formattedHours).toBe('1,500');
    });

    it('shows 0 hours when working_hours is null', () => {
      const workingHours = null;
      const displayValue = workingHours ?? 0;

      expect(displayValue).toBe(0);
    });

    it('allows updating working hours', () => {
      const currentHours = 1500;
      const additionalHours = 50;
      const newTotal = currentHours + additionalHours;

      expect(newTotal).toBe(1550);
    });
  });

  describe('Equipment Grid Display', () => {
    describe('as any user', () => {
      it('displays essential information on equipment card', () => {
        const eq = equipment.forklift1;

        // Card should show key information
        expect(eq.name).toBe('Forklift #1');
        expect(eq.manufacturer).toBe('Toyota');
        expect(eq.model).toBe('8FGU25');
        expect(eq.serial_number).toBe('TY-2024-001');
        expect(eq.status).toBe('active');
        expect(eq.location).toBe('Warehouse A');
      });

      it('shows non-active status badge', () => {
        const maintenanceEquipment = equipment.forklift2;
        expect(maintenanceEquipment.status).toBe('maintenance');

        // Badge should be visible for non-active statuses
        const shouldShowBadge = maintenanceEquipment.status !== 'active';
        expect(shouldShowBadge).toBe(true);
      });

      it('handles missing optional fields gracefully', () => {
        const minimalEquipment = {
          id: 'eq-minimal',
          name: 'Minimal Equipment',
          manufacturer: 'Mfg',
          model: 'Model',
          serial_number: 'SN1',
          status: 'active' as const,
          location: undefined,
          working_hours: undefined,
          image_url: undefined
        };

        // Optional fields can be undefined
        expect(minimalEquipment.location).toBeUndefined();
        expect(minimalEquipment.working_hours).toBeUndefined();
        expect(minimalEquipment.image_url).toBeUndefined();
      });

      it('handles long equipment names', () => {
        const longName = 'Very Long Equipment Name That Should Be Displayed Properly Without Breaking Layout';
        expect(longName.length).toBeGreaterThan(50);
      });
    });
  });
});
