import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderCard from '../WorkOrderCard';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';

// Mock hooks
vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn(() => ({
    workOrders: {
      getDetailedPermissions: vi.fn(() => ({
        canEdit: true,
        canEditAssignment: true,
        canChangeStatus: true,
        canDelete: true
      }))
    }
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderStatusUpdate', () => ({
  useWorkOrderStatusUpdate: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: vi.fn(() => ({
    assignmentOptions: [
      { id: 'user-1', name: 'John Doe', role: 'Technician' },
      { id: 'user-2', name: 'Jane Smith', role: 'Manager' }
    ],
    isLoading: false
  }))
}));

vi.mock('../WorkOrderCostSubtotal', () => ({
  default: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid={`cost-subtotal-${workOrderId}`}>$0.00</div>
  )
}));

vi.mock('../PMProgressIndicator', () => ({
  default: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid={`pm-progress-${workOrderId}`}>PM Progress</div>
  )
}));

vi.mock('../WorkOrderQuickActions', () => ({
  WorkOrderQuickActions: ({ workOrder }: { workOrder: WorkOrder }) => (
    <div data-testid={`quick-actions-${workOrder.id}`}>Quick Actions</div>
  )
}));

vi.mock('../WorkOrderAssignmentHover', () => ({
  WorkOrderAssignmentHover: ({ children, workOrder }: { children: React.ReactNode; workOrder: WorkOrder }) => (
    <div data-testid={`assignment-hover-${workOrder.id}`}>{children}</div>
  )
}));

const mockWorkOrder: WorkOrder = {
  id: 'wo-1',
  title: 'Test Work Order',
  description: 'Test description',
  status: 'in_progress',
  priority: 'high',
  equipment_id: 'eq-1',
  equipmentName: 'Test Equipment',
  organization_id: 'org-1',
  created_date: '2024-01-01T00:00:00Z',
  createdDate: '2024-01-01T00:00:00Z',
  due_date: '2024-01-15T00:00:00Z',
  dueDate: '2024-01-15T00:00:00Z',
  assignee_id: 'user-1',
  assigneeName: 'John Doe',
  team_id: 'team-1',
  teamName: 'Maintenance Team',
  equipmentTeamName: 'Maintenance Team',
  estimated_hours: 4,
  estimatedHours: 4,
  has_pm: false,
  pm_required: false,
  created_by: 'user-2',
  created_by_admin: false,
  created_by_name: 'Jane Smith',
  createdByName: 'Jane Smith',
  updated_at: '2024-01-01T00:00:00Z',
  is_historical: false,
  assignedTo: { id: 'user-1', name: 'John Doe' }
} as WorkOrder;

describe('WorkOrderCard', () => {
  const mockOnNavigate = vi.fn();
  const mockOnAcceptClick = vi.fn();
  const mockOnStatusUpdate = vi.fn();
  const mockOnAssignClick = vi.fn();
  const mockOnReopenClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Variant', () => {
    it('renders work order card with desktop variant by default', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('high priority')).toBeInTheDocument();
    });

    it('displays status badge with correct color', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      const statusBadge = screen.getByText(/in progress/i);
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays created date', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Created/i)).toBeInTheDocument();
    });

    it('displays due date when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Due Date/i)).toBeInTheDocument();
    });

    it('displays equipment team name when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Equipment Team/i)).toBeInTheDocument();
      expect(screen.getByText('Maintenance Team')).toBeInTheDocument();
    });

    it('displays assigned user when assigned', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Assigned to/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays unassigned state when no assignee', () => {
      const unassignedOrder = {
        ...mockWorkOrder,
        assignee_id: null,
        assigneeName: undefined,
        assignedTo: null
      };

      render(
        <WorkOrderCard
          workOrder={unassignedOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Unassigned/i)).toBeInTheDocument();
    });

    it('displays PM progress indicator when has_pm is true', () => {
      const pmOrder = {
        ...mockWorkOrder,
        has_pm: true
      };

      render(
        <WorkOrderCard
          workOrder={pmOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('pm-progress-wo-1')).toBeInTheDocument();
    });

    it('displays estimated hours when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Estimated time:/i)).toBeInTheDocument();
      expect(screen.getByText(/4 hours/i)).toBeInTheDocument();
    });

    it('displays cost subtotal when user has edit permissions', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('cost-subtotal-wo-1')).toBeInTheDocument();
    });

    it('calls onNavigate when View Details button is clicked', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      const viewButton = screen.getByRole('button', { name: /view details/i });
      fireEvent.click(viewButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
    });

    it('displays overdue indicator when due date is past and status is not completed', () => {
      const overdueOrder = {
        ...mockWorkOrder,
        due_date: '2023-01-01T00:00:00Z',
        dueDate: '2023-01-01T00:00:00Z',
        status: 'in_progress'
      };

      render(
        <WorkOrderCard
          workOrder={overdueOrder}
          onNavigate={mockOnNavigate}
        />
      );

      // Should show overdue styling (check for alert triangle icon)
      const dueDateSection = screen.getByText(/Due Date/i).closest('div');
      expect(dueDateSection).toBeInTheDocument();
    });
  });

  describe('Mobile Variant', () => {
    it('renders mobile variant correctly', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
          onAcceptClick={mockOnAcceptClick}
          onStatusUpdate={mockOnStatusUpdate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('displays equipment name on mobile', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Equipment: Test Equipment/i)).toBeInTheDocument();
    });

    it('displays status select dropdown when user can change status', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
          onStatusUpdate={mockOnStatusUpdate}
        />
      );

      expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    });

    it('displays assignment select dropdown', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Assigned:/i)).toBeInTheDocument();
    });

    it('displays accept button when status is submitted', () => {
      const submittedOrder = {
        ...mockWorkOrder,
        status: 'submitted'
      };

      render(
        <WorkOrderCard
          workOrder={submittedOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
          onAcceptClick={mockOnAcceptClick}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      expect(acceptButton).toBeInTheDocument();
    });

    it('calls onAcceptClick when accept button is clicked', () => {
      const submittedOrder = {
        ...mockWorkOrder,
        status: 'submitted'
      };

      render(
        <WorkOrderCard
          workOrder={submittedOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
          onAcceptClick={mockOnAcceptClick}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);

      expect(mockOnAcceptClick).toHaveBeenCalledWith(submittedOrder);
    });

    it('shows loading state when isAccepting is true', () => {
      const submittedOrder = {
        ...mockWorkOrder,
        status: 'submitted'
      };

      render(
        <WorkOrderCard
          workOrder={submittedOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
          onAcceptClick={mockOnAcceptClick}
          isAccepting={true}
        />
      );

      expect(screen.getByText(/Accepting.../i)).toBeInTheDocument();
    });

    it('displays PM progress indicator on mobile when has_pm is true', () => {
      const pmOrder = {
        ...mockWorkOrder,
        has_pm: true
      };

      render(
        <WorkOrderCard
          workOrder={pmOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('pm-progress-wo-1')).toBeInTheDocument();
    });

    it('displays cost subtotal on mobile', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('cost-subtotal-wo-1')).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('renders compact variant correctly', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
    });

    it('displays priority in compact format', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/high priority/i)).toBeInTheDocument();
    });

    it('displays status badge in compact variant', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      const statusBadge = screen.getByText(/in progress/i);
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays equipment name when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Equipment:/i)).toBeInTheDocument();
      expect(screen.getByText('Test Equipment')).toBeInTheDocument();
    });

    it('displays assignee name when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays team name when available', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Team:/i)).toBeInTheDocument();
      expect(screen.getByText('Maintenance Team')).toBeInTheDocument();
    });

    it('displays created date in compact format', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Created:/i)).toBeInTheDocument();
    });

    it('displays due date with overdue indicator when overdue', () => {
      const overdueOrder = {
        ...mockWorkOrder,
        due_date: '2023-01-01T00:00:00Z',
        dueDate: '2023-01-01T00:00:00Z',
        status: 'in_progress'
      };

      render(
        <WorkOrderCard
          workOrder={overdueOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Due:/i)).toBeInTheDocument();
    });

    it('displays PM progress indicator in compact variant when has_pm is true', () => {
      const pmOrder = {
        ...mockWorkOrder,
        has_pm: true
      };

      render(
        <WorkOrderCard
          workOrder={pmOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('pm-progress-wo-1')).toBeInTheDocument();
    });

    it('calls onNavigate when View Details button is clicked in compact variant', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="compact"
          onNavigate={mockOnNavigate}
        />
      );

      const viewButton = screen.getByRole('button', { name: /view details/i });
      fireEvent.click(viewButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing due date gracefully', () => {
      const noDueDateOrder = {
        ...mockWorkOrder,
        due_date: null,
        dueDate: undefined
      };

      render(
        <WorkOrderCard
          workOrder={noDueDateOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.queryByText(/Due Date/i)).not.toBeInTheDocument();
    });

    it('handles missing estimated hours gracefully', () => {
      const noHoursOrder = {
        ...mockWorkOrder,
        estimated_hours: null,
        estimatedHours: undefined
      };

      render(
        <WorkOrderCard
          workOrder={noHoursOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.queryByText(/Estimated time:/i)).not.toBeInTheDocument();
    });

    it('handles missing equipment team name gracefully', () => {
      const noTeamOrder = {
        ...mockWorkOrder,
        equipmentTeamName: undefined,
        teamName: undefined
      };

      render(
        <WorkOrderCard
          workOrder={noTeamOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.queryByText(/Equipment Team/i)).not.toBeInTheDocument();
    });

    it('handles completed date display', () => {
      const completedOrder = {
        ...mockWorkOrder,
        completed_date: '2024-01-10T00:00:00Z',
        completedDate: '2024-01-10T00:00:00Z',
        status: 'completed'
      };

      render(
        <WorkOrderCard
          workOrder={completedOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Completed:/i)).toBeInTheDocument();
    });

    it('handles all status types correctly', () => {
      const statuses = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

      statuses.forEach((status) => {
        const { unmount } = render(
          <WorkOrderCard
            workOrder={{ ...mockWorkOrder, status }}
            onNavigate={mockOnNavigate}
          />
        );

        expect(screen.getByText('Test Work Order')).toBeInTheDocument();
        unmount();
      });
    });

    it('handles all priority types correctly', () => {
      const priorities = ['low', 'medium', 'high'] as const;

      priorities.forEach((priority) => {
        const { unmount } = render(
          <WorkOrderCard
            workOrder={{ ...mockWorkOrder, priority }}
            onNavigate={mockOnNavigate}
          />
        );

        expect(screen.getByText(new RegExp(`${priority} priority`, 'i'))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Quick Actions Integration', () => {
    it('renders quick actions component', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
          onAssignClick={mockOnAssignClick}
          onReopenClick={mockOnReopenClick}
        />
      );

      expect(screen.getByTestId('quick-actions-wo-1')).toBeInTheDocument();
    });
  });

  describe('Assignment Hover Integration', () => {
    it('renders assignment hover component', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('assignment-hover-wo-1')).toBeInTheDocument();
    });
  });
});

