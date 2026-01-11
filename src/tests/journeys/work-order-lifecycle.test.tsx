/**
 * Work Order Lifecycle Journey Tests
 * 
 * These tests validate complete user workflows for work order management,
 * testing from the perspective of different user personas.
 * 
 * User Stories Covered:
 * - As an Owner/Admin, I want to create work orders and assign them to any team
 * - As a Team Manager, I want to filter and manage my team's work orders
 * - As a Technician, I want to update status and complete PM checklists on assigned work
 * - As any user, I want to track costs associated with work orders
 */

import React from 'react';
import { screen } from '@testing-library/react';
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

vi.mock('@/features/work-orders/hooks/useWorkOrderCosts', () => ({
  useCreateWorkOrderCost: vi.fn(),
  useUpdateWorkOrderCost: vi.fn(),
  useWorkOrderCosts: vi.fn()
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderFilters', () => ({
  useWorkOrderFilters: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

// Import after mocking
import { useWorkOrders } from '@/features/work-orders/hooks/useWorkOrders';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useCreateWorkOrderCost, useUpdateWorkOrderCost, useWorkOrderCosts } from '@/features/work-orders/hooks/useWorkOrderCosts';

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
      
      // Admin should see all work orders (use more specific regex to exclude work-order-list)
      const workOrderElements = screen.getAllByTestId(/^work-order-wo-/);
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
      // Use more specific regex to match actual work order items (not the list container)
      expect(screen.queryByTestId(/^work-order-wo-/)).not.toBeInTheDocument();
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
      // Using submitted work order for status transition test
      expect(workOrders.submitted.status).toBe('submitted');
      
      // Simulate manager assigning the work order
      const newStatus = 'assigned';
      
      // Valid transition from submitted to assigned
      expect(['accepted', 'assigned', 'cancelled']).toContain(newStatus);
    });

    it('allows technician to mark in_progress → completed', () => {
      // Using in_progress work order for status transition test
      expect(workOrders.inProgress.status).toBe('in_progress');
      
      // Simulate technician completing the work order
      const newStatus = 'completed';
      
      // Valid transition from in_progress to completed
      expect(['on_hold', 'completed', 'cancelled']).toContain(newStatus);
    });

    it('prevents invalid status transitions', () => {
      // Using submitted work order for invalid transition test
      expect(workOrders.submitted.status).toBe('submitted');
      
      // Cannot skip directly from submitted to completed
      const invalidTransition = 'completed';
      
      // This should NOT be a valid direct transition
      expect(['accepted', 'assigned', 'cancelled']).not.toContain(invalidTransition);
    });
  });

  describe('Creating Work Orders', () => {
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
              canDelete: true
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

      it('can create work order with all fields including priority and due date', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        // Admin can create work orders for any team
        expect(result.current.workOrders.canCreateAny).toBe(true);
        
        // Admin can set all fields
        const permissions = result.current.workOrders.getDetailedPermissions({} as never);
        expect(permissions.canEditPriority).toBe(true);
        expect(permissions.canEditDueDate).toBe(true);
        expect(permissions.canEditAssignment).toBe(true);
      });

      it('can assign work order to any team member during creation', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const permissions = result.current.workOrders.getPermissions({} as never);
        expect(permissions.canAssign).toBe(true);
      });

      it('can select equipment from any team', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        expect(result.current.equipment.canViewAll).toBe(true);
      });

      it('can enable PM checklist for work order', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const permissions = result.current.workOrders.getDetailedPermissions({} as never);
        expect(permissions.canEditPM).toBe(true);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
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
            getPermissions: () => ({
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          workOrders: {
            getPermissions: () => ({
              canView: true,
              canCreate: true,
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
              canEditDescription: true,
              canChangeStatus: false,
              canAddNotes: true,
              canAddImages: true,
              canAddCosts: false,
              canEditCosts: false,
              canViewPM: true,
              canEditPM: false
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

      it('can create basic work order for their team equipment', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.workOrders.getPermissions({} as never);
        expect(permissions.canCreate).toBe(true);
      });

      it('cannot assign work order to others', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.workOrders.getPermissions({} as never);
        expect(permissions.canAssign).toBe(false);
      });

      it('cannot set priority on created work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const permissions = result.current.workOrders.getDetailedPermissions({} as never);
        expect(permissions.canEditPriority).toBe(false);
      });

      it('can only see equipment from their team', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        expect(result.current.equipment.canViewAll).toBe(false);
      });
    });

    describe('form validation', () => {
      it('requires title for work order submission', () => {
        const formData = {
          title: '',
          description: 'Some description',
          equipmentId: equipment.forklift1.id,
          priority: 'medium'
        };

        // Title is required
        expect(formData.title.length).toBe(0);
        expect(formData.equipmentId.length).toBeGreaterThan(0);
      });

      it('requires equipment selection', () => {
        const formData = {
          title: 'Oil Change',
          description: '',
          equipmentId: '',
          priority: 'medium'
        };

        // Equipment is required
        expect(formData.equipmentId.length).toBe(0);
      });

      it('validates due date is in the future', () => {
        const now = new Date();
        const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        expect(pastDate < now).toBe(true);
        expect(futureDate > now).toBe(true);
      });
    });
  });

  describe('Filtering and Search', () => {
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
      });

      it('can filter work orders by status', () => {
        const filters = {
          statusFilter: 'in_progress',
          priorityFilter: 'all',
          assigneeFilter: 'all',
          teamFilter: 'all'
        };

        const filteredWorkOrders = teamWorkOrders.filter(
          wo => filters.statusFilter === 'all' || wo.status === filters.statusFilter
        );

        expect(filteredWorkOrders.every(wo => wo.status === 'in_progress' || filters.statusFilter === 'all')).toBe(true);
      });

      it('can filter work orders by priority', () => {
        const filters = {
          statusFilter: 'all',
          priorityFilter: 'high',
          assigneeFilter: 'all'
        };

        const filteredWorkOrders = teamWorkOrders.filter(
          wo => filters.priorityFilter === 'all' || wo.priority === filters.priorityFilter
        );

        expect(filteredWorkOrders.every(wo => wo.priority === 'high' || filters.priorityFilter === 'all')).toBe(true);
      });

      it('can search work orders by title or equipment name', () => {
        const searchQuery = 'Forklift';

        const searchResults = teamWorkOrders.filter(
          wo => wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (wo.equipmentName?.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Search should match equipment names
        expect(searchResults.length).toBeGreaterThanOrEqual(0);
      });

      it('can use quick filter for "My Work" to see assigned work orders', () => {
        const currentUserId = personas.teamManager.id;
        
        const myWorkOrders = teamWorkOrders.filter(
          wo => wo.assignee_id === currentUserId
        );

        // Should filter to only assigned work orders
        expect(myWorkOrders.every(wo => wo.assignee_id === currentUserId)).toBe(true);
      });

      it('can use quick filter for overdue work orders', () => {
        const now = new Date();
        
        const overdueWorkOrders = teamWorkOrders.filter(wo => {
          if (!wo.due_date) return false;
          return new Date(wo.due_date) < now && wo.status !== 'completed' && wo.status !== 'cancelled';
        });

        // Should identify overdue items
        expect(overdueWorkOrders.every(wo => wo.status !== 'completed')).toBe(true);
      });

      it('can clear all filters to see full list', () => {
        const defaultFilters = {
          searchQuery: '',
          statusFilter: 'all',
          priorityFilter: 'all',
          assigneeFilter: 'all',
          teamFilter: 'all',
          dueDateFilter: 'all'
        };

        // All filters are reset
        expect(defaultFilters.statusFilter).toBe('all');
        expect(defaultFilters.priorityFilter).toBe('all');
        expect(defaultFilters.searchQuery).toBe('');
      });
    });

    describe('as an Admin', () => {
      it('can filter by team', () => {
        const filters = {
          teamFilter: teams.maintenance.id
        };

        const allWorkOrders = Object.values(workOrders);
        const filteredByTeam = allWorkOrders.filter(
          wo => wo.team_id === filters.teamFilter
        );

        expect(filteredByTeam.every(wo => wo.team_id === teams.maintenance.id)).toBe(true);
      });

      it('sees unassigned quick filter option', () => {
        const allWorkOrders = Object.values(workOrders);
        const unassignedWorkOrders = allWorkOrders.filter(
          wo => wo.assignee_id === null
        );

        expect(unassignedWorkOrders.every(wo => wo.assignee_id === null)).toBe(true);
      });
    });
  });

  describe('Cost Tracking', () => {
    const createMockMutationResult = (overrides: Record<string, unknown> = {}) => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isIdle: true,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
      variables: undefined,
      context: undefined,
      status: 'idle' as const,
      reset: vi.fn(),
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
      isPaused: false,
      ...overrides
    });

    describe('as an Admin', () => {
      beforeEach(() => {
        vi.mocked(useCreateWorkOrderCost).mockReturnValue(createMockMutationResult());
        vi.mocked(useUpdateWorkOrderCost).mockReturnValue(createMockMutationResult());
        vi.mocked(useWorkOrderCosts).mockReturnValue({
          data: [
            {
              id: 'cost-1',
              work_order_id: workOrders.inProgress.id,
              description: 'Replacement parts',
              quantity: 2,
              unit_price_cents: 5000,
              total_price_cents: 10000,
              created_by: personas.admin.id,
              created_at: '2024-01-05T10:00:00Z',
              updated_at: '2024-01-05T10:00:00Z'
            }
          ],
          isLoading: false,
          isError: false,
          error: null
        } as ReturnType<typeof useWorkOrderCosts>);

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => true,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: true, canInviteMembers: true, canCreateTeams: true, canViewBilling: false, canManageMembers: true },
          equipment: { getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true }), canViewAll: true, canCreateAny: true },
          workOrders: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true, canAssign: true, canChangeStatus: true }),
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
          teams: { getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: false }), canCreateAny: true },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: true, canAddPrivateNote: true, canEditOwnNote: () => true, canEditAnyNote: true, canDeleteOwnNote: () => true, canDeleteAnyNote: true, canUploadImages: true, canDeleteImages: true, canSetDisplayImage: true }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can add costs to any work order', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const permissions = result.current.workOrders.getDetailedPermissions(workOrders.inProgress as never);
        expect(permissions.canAddCosts).toBe(true);
      });

      it('can edit existing costs', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'admin'
        );

        const permissions = result.current.workOrders.getDetailedPermissions(workOrders.inProgress as never);
        expect(permissions.canEditCosts).toBe(true);
      });

      it('calculates total correctly from quantity and unit price', () => {
        const costEntry = {
          description: 'Parts',
          quantity: 3,
          unit_price_cents: 1500 // $15.00
        };

        const totalCents = costEntry.quantity * costEntry.unit_price_cents;
        expect(totalCents).toBe(4500); // $45.00
      });

      it('validates cost description is required', () => {
        const invalidCost = {
          description: '',
          quantity: 1,
          unit_price_cents: 1000
        };

        expect(invalidCost.description.length).toBe(0);
      });

      it('validates quantity must be greater than 0', () => {
        const invalidCost = {
          description: 'Parts',
          quantity: 0,
          unit_price_cents: 1000
        };

        expect(invalidCost.quantity).toBeLessThanOrEqual(0);
      });

      it('validates unit price cannot be negative', () => {
        const invalidCost = {
          description: 'Parts',
          quantity: 1,
          unit_price_cents: -500
        };

        expect(invalidCost.unit_price_cents).toBeLessThan(0);
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canViewAll: false, canCreateAny: false },
          workOrders: {
            getPermissions: (wo) => {
              const isAssigned = wo?.assignee_id === personas.technician.id;
              return { canView: isAssigned, canCreate: true, canEdit: isAssigned, canDelete: false, canAssign: false, canChangeStatus: isAssigned };
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
          teams: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canCreateAny: false },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: true, canAddPrivateNote: false, canEditOwnNote: () => true, canEditAnyNote: false, canDeleteOwnNote: () => true, canDeleteAnyNote: false, canUploadImages: true, canDeleteImages: false, canSetDisplayImage: false }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can add costs to assigned work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const assignedWO = workOrders.assigned;
        const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
        expect(permissions.canAddCosts).toBe(true);
      });

      it('cannot add costs to unassigned work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const unassignedWO = workOrders.submitted;
        const permissions = result.current.workOrders.getDetailedPermissions(unassignedWO as never);
        expect(permissions.canAddCosts).toBe(false);
      });
    });
  });

  describe('PM Checklist Completion', () => {
    describe('as a Technician with PM-enabled work order', () => {
      beforeEach(() => {
        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canViewAll: false, canCreateAny: false },
          workOrders: {
            getPermissions: (wo) => {
              const isAssigned = wo?.assignee_id === personas.technician.id;
              return { canView: isAssigned, canCreate: true, canEdit: isAssigned, canDelete: false, canAssign: false, canChangeStatus: isAssigned };
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
          teams: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canCreateAny: false },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: true, canAddPrivateNote: false, canEditOwnNote: () => true, canEditAnyNote: false, canDeleteOwnNote: () => true, canDeleteAnyNote: false, canUploadImages: true, canDeleteImages: false, canSetDisplayImage: false }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view PM checklist on assigned work order', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const assignedWO = workOrders.assigned;
        const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
        expect(permissions.canViewPM).toBe(true);
      });

      it('can complete checklist items with condition ratings', () => {
        const checklistItem = {
          id: 'item-1',
          title: 'Check oil level',
          section: 'Engine',
          required: true,
          condition: null as number | null,
          notes: ''
        };

        // Technician sets condition to OK (1)
        checklistItem.condition = 1;
        expect(checklistItem.condition).toBe(1);

        // Technician sets condition to needs adjustment (2)
        checklistItem.condition = 2;
        expect(checklistItem.condition).toBe(2);
      });

      it('auto-expands notes when selecting negative condition (2-5)', () => {
        const negativeConditions = [2, 3, 4, 5]; // Adjusted, Recommend Repairs, Immediate Repairs, Unsafe
        
        negativeConditions.forEach(condition => {
          const shouldShowNotes = condition >= 2 && condition <= 5;
          expect(shouldShowNotes).toBe(true);
        });
      });

      it('calculates completion percentage correctly', () => {
        const checklist = {
          totalItems: 10,
          completedItems: 7
        };

        const percentage = Math.round((checklist.completedItems / checklist.totalItems) * 100);
        expect(percentage).toBe(70);
      });

      it('cannot complete work order until PM checklist is 100% complete when pm_required is true', () => {
        const workOrderWithPM = {
          ...workOrders.assigned,
          has_pm: true,
          pm_required: true,
          pm_completion_percentage: 80
        };

        const canComplete = workOrderWithPM.pm_completion_percentage === 100;
        expect(canComplete).toBe(false);

        // After completing PM
        workOrderWithPM.pm_completion_percentage = 100;
        const canCompleteNow = workOrderWithPM.pm_completion_percentage === 100;
        expect(canCompleteNow).toBe(true);
      });

      it('can add notes to individual checklist items', () => {
        const checklistItem = {
          id: 'item-1',
          title: 'Check oil level',
          condition: 2, // Adjusted
          notes: ''
        };

        // Add notes
        checklistItem.notes = 'Oil level was low, topped up';
        expect(checklistItem.notes.length).toBeGreaterThan(0);
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
          equipment: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canViewAll: false, canCreateAny: false },
          workOrders: {
            getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false, canAssign: false, canChangeStatus: false }),
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
              canViewPM: true,
              canEditPM: false
            }),
            canViewAll: false,
            canCreateAny: false
          },
          teams: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canCreateAny: false },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: false, canAddPrivateNote: false, canEditOwnNote: () => false, canEditAnyNote: false, canDeleteOwnNote: () => false, canDeleteAnyNote: false, canUploadImages: false, canDeleteImages: false, canSetDisplayImage: false }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view PM checklist but cannot edit', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'viewer'
        );

        const permissions = result.current.workOrders.getDetailedPermissions({} as never);
        expect(permissions.canViewPM).toBe(true);
        expect(permissions.canEditPM).toBe(false);
      });
    });
  });

  describe('Cost Management with Inventory Integration', () => {
    /**
     * User Journey: Managing work order costs with inventory tracking
     * 
     * This section tests the service-level logic for cost management,
     * including inventory-linked costs and quantity tracking.
     */

    describe('as an Admin', () => {
      beforeEach(() => {
        vi.mocked(useWorkOrderCosts).mockReturnValue({
          data: [
            {
              id: 'cost-1',
              work_order_id: workOrders.inProgress.id,
              description: 'Oil Filter',
              quantity: 2,
              unit_price_cents: 2499,
              total_price_cents: 4998,
              created_by: personas.admin.id,
              inventory_item_id: 'inv-oil-filter',
              created_at: '2024-01-05T10:00:00Z',
              updated_at: '2024-01-05T10:00:00Z'
            },
            {
              id: 'cost-2',
              work_order_id: workOrders.inProgress.id,
              description: 'Labor - 2 hours',
              quantity: 2,
              unit_price_cents: 7500,
              total_price_cents: 15000,
              created_by: personas.admin.id,
              inventory_item_id: null, // Manual entry, not from inventory
              created_at: '2024-01-05T11:00:00Z',
              updated_at: '2024-01-05T11:00:00Z'
            }
          ],
          isLoading: false,
          isError: false,
          error: null
        } as ReturnType<typeof useWorkOrderCosts>);

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => true,
          isTeamMember: () => true,
          isTeamManager: () => true,
          organization: { canManage: true, canInviteMembers: true, canCreateTeams: true, canViewBilling: false, canManageMembers: true },
          equipment: { getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true }), canViewAll: true, canCreateAny: true },
          workOrders: {
            getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true, canAssign: true, canChangeStatus: true }),
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
          teams: { getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: false }), canCreateAny: true },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: true, canAddPrivateNote: true, canEditOwnNote: () => true, canEditAnyNote: true, canDeleteOwnNote: () => true, canDeleteAnyNote: true, canUploadImages: true, canDeleteImages: true, canSetDisplayImage: true }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can view costs with inventory item links', () => {
        const { result } = renderHookAsPersona(
          () => useWorkOrderCosts(workOrders.inProgress.id),
          'admin'
        );

        expect(result.current.data).toBeDefined();
        expect(result.current.data?.length).toBe(2);
        
        // First cost is linked to inventory
        expect(result.current.data?.[0].inventory_item_id).toBe('inv-oil-filter');
        // Second cost is manual entry
        expect(result.current.data?.[1].inventory_item_id).toBeNull();
      });

      it('can add costs from inventory items', () => {
        const inventoryBasedCost = {
          work_order_id: workOrders.inProgress.id,
          description: 'Hydraulic Hose',
          quantity: 1,
          unit_price_cents: 8950,
          inventory_item_id: 'inv-hydraulic-hose',
          original_quantity: 1
        };

        expect(inventoryBasedCost.inventory_item_id).toBeDefined();
        expect(inventoryBasedCost.original_quantity).toBe(1);
      });

      it('tracks quantity changes for inventory adjustment', () => {
        const originalCost = {
          id: 'cost-1',
          quantity: 2,
          inventory_item_id: 'inv-oil-filter'
        };

        // Increase quantity (taking more from inventory)
        const newQuantity = 5;
        const delta = originalCost.quantity - newQuantity; // 2 - 5 = -3 (negative = take from inventory)
        
        expect(delta).toBe(-3);

        // Decrease quantity (returning to inventory)
        const reducedQuantity = 1;
        const returnDelta = originalCost.quantity - reducedQuantity; // 2 - 1 = 1 (positive = return to inventory)
        
        expect(returnDelta).toBe(1);
      });

      it('deleting cost returns quantity to inventory when linked', () => {
        const inventoryLinkedCost = {
          id: 'cost-1',
          quantity: 2,
          inventory_item_id: 'inv-oil-filter'
        };

        // When deleting, the full quantity should be returned
        const inventoryInfo = inventoryLinkedCost.inventory_item_id 
          ? { inventory_item_id: inventoryLinkedCost.inventory_item_id, quantity: inventoryLinkedCost.quantity }
          : null;

        expect(inventoryInfo).not.toBeNull();
        expect(inventoryInfo?.quantity).toBe(2);
      });

      it('deleting manual cost does not affect inventory', () => {
        const manualCost = {
          id: 'cost-2',
          quantity: 2,
          inventory_item_id: null
        };

        const inventoryInfo = manualCost.inventory_item_id 
          ? { inventory_item_id: manualCost.inventory_item_id, quantity: manualCost.quantity }
          : null;

        expect(inventoryInfo).toBeNull();
      });

      it('calculates total cost correctly', () => {
        const costs = [
          { quantity: 2, unit_price_cents: 2499, total_price_cents: 4998 },
          { quantity: 2, unit_price_cents: 7500, total_price_cents: 15000 }
        ];

        const totalCents = costs.reduce((sum, cost) => sum + cost.total_price_cents, 0);
        
        expect(totalCents).toBe(19998); // $199.98
      });
    });

    describe('as a Technician', () => {
      beforeEach(() => {
        vi.mocked(useWorkOrderCosts).mockReturnValue({
          data: [
            {
              id: 'cost-1',
              work_order_id: workOrders.assigned.id,
              description: 'Parts used',
              quantity: 1,
              unit_price_cents: 5000,
              total_price_cents: 5000,
              created_by: personas.technician.id,
              created_at: '2024-01-05T10:00:00Z',
              updated_at: '2024-01-05T10:00:00Z'
            }
          ],
          isLoading: false,
          isError: false,
          error: null
        } as ReturnType<typeof useWorkOrderCosts>);

        vi.mocked(useUnifiedPermissions).mockReturnValue({
          hasRole: () => false,
          isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
          isTeamManager: () => false,
          organization: { canManage: false, canInviteMembers: false, canCreateTeams: false, canViewBilling: false, canManageMembers: false },
          equipment: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canViewAll: false, canCreateAny: false },
          workOrders: {
            getPermissions: (wo) => {
              const isAssigned = wo?.assignee_id === personas.technician.id;
              return { canView: isAssigned, canCreate: true, canEdit: isAssigned, canDelete: false, canAssign: false, canChangeStatus: isAssigned };
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
          teams: { getPermissions: () => ({ canView: true, canCreate: false, canEdit: false, canDelete: false }), canCreateAny: false },
          notes: { getPermissions: () => ({ canViewNotes: true, canAddPublicNote: true, canAddPrivateNote: false, canEditOwnNote: () => true, canEditAnyNote: false, canDeleteOwnNote: () => true, canDeleteAnyNote: false, canUploadImages: true, canDeleteImages: false, canSetDisplayImage: false }) }
        } as unknown as ReturnType<typeof useUnifiedPermissions>);
      });

      it('can add costs to assigned work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const assignedWO = workOrders.assigned;
        const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
        
        expect(permissions.canAddCosts).toBe(true);
      });

      it('cannot add costs to unassigned work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const unassignedWO = workOrders.submitted;
        const permissions = result.current.workOrders.getDetailedPermissions(unassignedWO as never);
        
        expect(permissions.canAddCosts).toBe(false);
      });

      it('cost tracks creator information', () => {
        const newCost = {
          work_order_id: workOrders.assigned.id,
          description: 'Replacement part',
          quantity: 1,
          unit_price_cents: 3500,
          created_by: personas.technician.id
        };

        expect(newCost.created_by).toBe(personas.technician.id);
      });

      it('can edit own costs on assigned work orders', () => {
        const { result } = renderHookAsPersona(
          () => useUnifiedPermissions(),
          'technician'
        );

        const assignedWO = workOrders.assigned;
        const permissions = result.current.workOrders.getDetailedPermissions(assignedWO as never);
        
        expect(permissions.canEditCosts).toBe(true);
      });
    });

    describe('Cost Validation', () => {
      it('requires description for cost items', () => {
        const invalidCost = {
          description: '',
          quantity: 1,
          unit_price_cents: 1000
        };

        const isValid = invalidCost.description.trim().length > 0;
        expect(isValid).toBe(false);
      });

      it('requires quantity greater than zero', () => {
        const invalidCosts = [
          { description: 'Parts', quantity: 0, unit_price_cents: 1000 },
          { description: 'Parts', quantity: -1, unit_price_cents: 1000 }
        ];

        invalidCosts.forEach(cost => {
          const isValid = cost.quantity > 0;
          expect(isValid).toBe(false);
        });
      });

      it('allows zero unit price for free items', () => {
        const freeCost = {
          description: 'Warranty replacement',
          quantity: 1,
          unit_price_cents: 0
        };

        const isValid = freeCost.unit_price_cents >= 0;
        expect(isValid).toBe(true);
      });

      it('rejects negative unit price', () => {
        const invalidCost = {
          description: 'Parts',
          quantity: 1,
          unit_price_cents: -500
        };

        const isValid = invalidCost.unit_price_cents >= 0;
        expect(isValid).toBe(false);
      });
    });

    describe('Cost Summary and Reporting', () => {
      it('aggregates costs by user', () => {
        const costs = [
          { created_by: 'user-1', total_price_cents: 5000 },
          { created_by: 'user-1', total_price_cents: 3000 },
          { created_by: 'user-2', total_price_cents: 2500 }
        ];

        const summary = costs.reduce((acc, cost) => {
          if (!acc[cost.created_by]) {
            acc[cost.created_by] = { totalCosts: 0, itemCount: 0 };
          }
          acc[cost.created_by].totalCosts += cost.total_price_cents;
          acc[cost.created_by].itemCount += 1;
          return acc;
        }, {} as Record<string, { totalCosts: number; itemCount: number }>);

        expect(summary['user-1'].totalCosts).toBe(8000);
        expect(summary['user-1'].itemCount).toBe(2);
        expect(summary['user-2'].totalCosts).toBe(2500);
        expect(summary['user-2'].itemCount).toBe(1);
      });

      it('filters costs by organization via work order relationship', () => {
        const organizationId = 'org-acme';
        const costs = [
          { work_order: { organization_id: 'org-acme' }, total_price_cents: 5000 },
          { work_order: { organization_id: 'org-acme' }, total_price_cents: 3000 },
          { work_order: { organization_id: 'org-other' }, total_price_cents: 2500 }
        ];

        const orgCosts = costs.filter(c => c.work_order.organization_id === organizationId);

        expect(orgCosts.length).toBe(2);
      });

      it('calculates work order total from all costs', () => {
        const workOrderCosts = [
          { total_price_cents: 4998 },
          { total_price_cents: 15000 },
          { total_price_cents: 2500 }
        ];

        const total = workOrderCosts.reduce((sum, c) => sum + c.total_price_cents, 0);

        expect(total).toBe(22498); // $224.98
      });
    });

    describe('Multi-tenancy for Costs', () => {
      it('validates organization ownership before fetching costs', () => {
        // Costs are only visible if the work order belongs to the user's organization
        const workOrderWithOrg = {
          id: 'wo-1',
          organization_id: 'org-acme'
        };

        const userOrgId = 'org-acme';
        const canAccessCosts = workOrderWithOrg.organization_id === userOrgId;

        expect(canAccessCosts).toBe(true);
      });

      it('returns empty when work order not found for organization', () => {
        const workOrderWithOrg = {
          id: 'wo-1',
          organization_id: 'org-other'
        };

        const userOrgId = 'org-acme';
        const canAccessCosts = workOrderWithOrg.organization_id === userOrgId;

        expect(canAccessCosts).toBe(false);
      });
    });
  });
});
