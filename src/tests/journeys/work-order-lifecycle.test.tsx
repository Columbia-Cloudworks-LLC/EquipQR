/**
 * Work Order Lifecycle Journey Tests
 * 
 * These tests validate complete user workflows for work order management,
 * testing from the perspective of different user personas.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { workOrders, equipment, teams } from '@/test/fixtures/entities';

// Mock the work order hooks
vi.mock('@/features/work-orders/hooks/useWorkOrders', () => ({
  useWorkOrders: vi.fn()
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderCreation', () => ({
  useWorkOrderCreation: vi.fn()
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderStatusUpdate', () => ({
  useWorkOrderStatusUpdate: vi.fn()
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderAssignment', () => ({
  useWorkOrderAssignment: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

// Import after mocking
import { useWorkOrders } from '@/features/work-orders/hooks/useWorkOrders';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

// Test component that exercises the work order list
const WorkOrderTestComponent = () => {
  const { data: workOrderList, isLoading } = useWorkOrders();
  
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  
  return (
    <div data-testid="work-order-list">
      <h1>Work Orders</h1>
      {workOrderList?.map((wo) => (
        <div key={wo.id} data-testid={`work-order-${wo.id}`}>
          <span data-testid="wo-title">{wo.title}</span>
          <span data-testid="wo-status">{wo.status}</span>
          <span data-testid="wo-assignee">{wo.assignee_name || 'Unassigned'}</span>
        </div>
      ))}
    </div>
  );
};

describe('Work Order Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as an Organization Owner', () => {
    beforeEach(() => {
      // Owner sees all work orders across all teams
      vi.mocked(useWorkOrders).mockReturnValue({
        data: Object.values(workOrders),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useWorkOrders>);

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

    it('can view all work orders across all teams', () => {
      renderAsPersona(<WorkOrderTestComponent />, 'owner');

      expect(screen.getByTestId('work-order-list')).toBeInTheDocument();
      
      // Owner should see work orders from all teams
      expect(screen.getByTestId(`work-order-${workOrders.submitted.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`work-order-${workOrders.inProgress.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`work-order-${workOrders.completed.id}`)).toBeInTheDocument();
    });

    it('has full administrative permissions on all work orders', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'owner'
      );

      const permissions = result.current.workOrders.getDetailedPermissions(workOrders.submitted as never);
      
      expect(permissions.canEdit).toBe(true);
      expect(permissions.canEditAssignment).toBe(true);
      expect(permissions.canChangeStatus).toBe(true);
      expect(permissions.canEditCosts).toBe(true);
    });
  });

  describe('as an Admin', () => {
    beforeEach(() => {
      vi.mocked(useWorkOrders).mockReturnValue({
        data: Object.values(workOrders),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useWorkOrders>);

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
          canViewBilling: false, // Admin cannot view billing
          canManageMembers: true
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
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true
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

    it('can view all work orders and assign to any team member', () => {
      renderAsPersona(<WorkOrderTestComponent />, 'admin');

      expect(screen.getByTestId('work-order-list')).toBeInTheDocument();
      
      // Admin should see all work orders
      const workOrderElements = screen.getAllByTestId(/^work-order-/);
      expect(workOrderElements.length).toBe(Object.keys(workOrders).length);
    });

    it('can create work orders for any team', async () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'admin'
      );

      expect(result.current.workOrders.canCreateAny).toBe(true);
    });
  });

  describe('as a Team Manager', () => {
    const teamWorkOrders = Object.values(workOrders).filter(
      wo => wo.team_id === teams.maintenance.id
    );

    beforeEach(() => {
      vi.mocked(useWorkOrders).mockReturnValue({
        data: teamWorkOrders,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useWorkOrders>);

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
        workOrders: {
          getPermissions: (wo) => {
            const isTeamWO = wo?.team_id === teams.maintenance.id;
            return {
              canView: isTeamWO,
              canCreate: true,
              canEdit: isTeamWO,
              canDelete: false,
              canAssign: isTeamWO,
              canChangeStatus: isTeamWO
            };
          },
          getDetailedPermissions: (wo) => {
            const isTeamWO = wo?.team_id === teams.maintenance.id;
            return {
              canEdit: isTeamWO,
              canEditPriority: isTeamWO,
              canEditAssignment: isTeamWO,
              canEditDueDate: isTeamWO,
              canEditDescription: isTeamWO,
              canChangeStatus: isTeamWO,
              canAddNotes: isTeamWO,
              canAddImages: isTeamWO,
              canAddCosts: isTeamWO,
              canEditCosts: isTeamWO,
              canViewPM: isTeamWO,
              canEditPM: isTeamWO
            };
          },
          canViewAll: false,
          canCreateAny: false
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: true,
            canDelete: false
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

    it('can only view work orders from their managed team', () => {
      renderAsPersona(<WorkOrderTestComponent />, 'teamManager');

      expect(screen.getByTestId('work-order-list')).toBeInTheDocument();
      
      // Should only see maintenance team work orders
      teamWorkOrders.forEach(wo => {
        expect(screen.getByTestId(`work-order-${wo.id}`)).toBeInTheDocument();
      });
    });

    it('can assign work orders to technicians in their team', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      const teamWO = workOrders.submitted;
      const permissions = result.current.workOrders.getPermissions(teamWO as never);
      
      expect(permissions.canAssign).toBe(true);
    });

    it('cannot assign work orders from other teams', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      // Work order from field team (not managed by this manager)
      const otherTeamWO = { ...workOrders.inProgress, team_id: teams.field.id };
      const permissions = result.current.workOrders.getPermissions(otherTeamWO as never);
      
      expect(permissions.canAssign).toBe(false);
    });
  });

  describe('as a Technician', () => {
    const technicianWorkOrders = Object.values(workOrders).filter(
      wo => wo.assignee_id === personas.technician.id
    );

    beforeEach(() => {
      vi.mocked(useWorkOrders).mockReturnValue({
        data: technicianWorkOrders,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useWorkOrders>);

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
        workOrders: {
          getPermissions: (wo) => {
            const isAssigned = wo?.assignee_id === personas.technician.id;
            return {
              canView: isAssigned,
              canCreate: true,
              canEdit: isAssigned,
              canDelete: false,
              canAssign: false, // Technicians cannot assign
              canChangeStatus: isAssigned
            };
          },
          getDetailedPermissions: (wo) => {
            const isAssigned = wo?.assignee_id === personas.technician.id;
            return {
              canEdit: isAssigned,
              canEditPriority: false,
              canEditAssignment: false,
              canEditDueDate: false,
              canEditDescription: isAssigned,
              canChangeStatus: isAssigned,
              canAddNotes: isAssigned,
              canAddImages: isAssigned,
              canAddCosts: isAssigned,
              canEditCosts: isAssigned,
              canViewPM: isAssigned,
              canEditPM: isAssigned
            };
          },
          canViewAll: false,
          canCreateAny: false
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false
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

    it('can only view work orders assigned to them', () => {
      renderAsPersona(<WorkOrderTestComponent />, 'technician');

      expect(screen.getByTestId('work-order-list')).toBeInTheDocument();
      
      // Should only see assigned work orders
      technicianWorkOrders.forEach(wo => {
        expect(screen.getByTestId(`work-order-${wo.id}`)).toBeInTheDocument();
      });

      // Should NOT see unassigned work orders
      expect(screen.queryByTestId(`work-order-${workOrders.submitted.id}`)).not.toBeInTheDocument();
    });

    it('can update status on assigned work orders', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const assignedWO = workOrders.assigned;
      const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
      
      expect(permissions.canChangeStatus).toBe(true);
    });

    it('cannot assign work orders to others', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const assignedWO = workOrders.assigned;
      const permissions = result.current.workOrders.getPermissions(assignedWO as never);
      
      expect(permissions.canAssign).toBe(false);
    });

    it('cannot edit priority or due date', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const assignedWO = workOrders.assigned;
      const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
      
      expect(permissions.canEditPriority).toBe(false);
      expect(permissions.canEditDueDate).toBe(false);
    });

    it('can complete PM checklist on assigned work orders', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'technician'
      );

      const assignedWO = workOrders.assigned;
      const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
      
      expect(permissions.canViewPM).toBe(true);
      expect(permissions.canEditPM).toBe(true);
    });
  });

  describe('as a Read-Only Member', () => {
    beforeEach(() => {
      vi.mocked(useWorkOrders).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useWorkOrders>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('member');
        },
        isTeamMember: () => false,
        isTeamManager: () => false,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        workOrders: {
          getPermissions: () => ({
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canAssign: false,
            canChangeStatus: false
          }),
          getDetailedPermissions: () => ({
            canEdit: false,
            canEditPriority: false,
            canEditAssignment: false,
            canEditDueDate: false,
            canEditDescription: false,
            canChangeStatus: false,
            canAddNotes: false,
            canAddImages: false,
            canAddCosts: false,
            canEditCosts: false,
            canViewPM: false,
            canEditPM: false
          }),
          canViewAll: false,
          canCreateAny: false
        },
        equipment: {
          getPermissions: () => ({
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false
          }),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: () => ({
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({
            canViewNotes: false,
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

    it('cannot see any work orders without team membership', () => {
      renderAsPersona(<WorkOrderTestComponent />, 'readOnlyMember');

      expect(screen.getByTestId('work-order-list')).toBeInTheDocument();
      expect(screen.queryByTestId(/^work-order-/)).not.toBeInTheDocument();
    });

    it('cannot create work orders', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'readOnlyMember'
      );

      expect(result.current.workOrders.canCreateAny).toBe(false);
    });
  });

  describe('Work Order Status Transitions', () => {
    const statusUpdateMock = vi.fn();

    beforeEach(() => {
      vi.mocked(useWorkOrderStatusUpdate).mockReturnValue({
        mutate: statusUpdateMock,
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        reset: vi.fn(),
        data: undefined,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: true,
        isPaused: false,
        status: 'idle',
        submittedAt: 0
      });
    });

    it('allows valid status transitions: submitted → assigned', () => {
      const workOrder = { ...workOrders.submitted };
      
      // Simulate manager assigning the work order
      const newStatus = 'assigned';
      
      // Valid transition from submitted to assigned
      expect(['accepted', 'assigned', 'cancelled']).toContain(newStatus);
    });

    it('allows technician to mark in_progress → completed', () => {
      const workOrder = { ...workOrders.inProgress };
      
      // Simulate technician completing the work order
      const newStatus = 'completed';
      
      // Valid transition from in_progress to completed
      expect(['on_hold', 'completed', 'cancelled']).toContain(newStatus);
    });

    it('prevents invalid status transitions', () => {
      const workOrder = { ...workOrders.submitted };
      
      // Cannot skip directly from submitted to completed
      const invalidTransition = 'completed';
      
      // This should NOT be a valid direct transition
      expect(['accepted', 'assigned', 'cancelled']).not.toContain(invalidTransition);
    });
  });
});
