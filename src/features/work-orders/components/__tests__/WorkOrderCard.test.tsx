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
  WorkOrderQuickActions: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid={`quick-actions-${workOrderId}`}>Quick Actions</div>
  )
}));

vi.mock('../WorkOrderAssignmentHover', () => ({
  WorkOrderAssignmentHover: ({ children, workOrder }: { children: React.ReactNode; workOrder: { id: string } }) => (
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
  due_date: '2024-01-15T00:00:00Z',
  assignee_id: 'user-1',
  assignee_name: 'John Doe',
  assigneeName: 'John Doe',
  team_id: 'team-1',
  teamName: 'Maintenance Team',
  equipmentTeamName: 'Maintenance Team',
  estimated_hours: 4,
  has_pm: false,
  pm_required: false,
  created_by: 'user-2',
  created_by_admin: null,
  created_by_name: 'Jane Smith',
  createdByName: 'Jane Smith',
  updated_at: '2024-01-01T00:00:00Z',
  is_historical: false,
  acceptance_date: null,
  completed_date: null,
  historical_notes: null,
  historical_start_date: null,
  assignedTo: { id: 'user-1', name: 'John Doe' }
};

describe('WorkOrderCard', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('displays all critical information for triage (title, status, priority, assignee, dates, team)', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          onNavigate={mockOnNavigate}
        />
      );

      // Title and description
      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      
      // Status and priority
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      expect(screen.getByText('high priority')).toBeInTheDocument();
      
      // Assignee and team
      expect(screen.getByText(/Assigned to/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Equipment Team/i)).toBeInTheDocument();
      expect(screen.getByText('Maintenance Team')).toBeInTheDocument();
      
      // Dates and time estimate
      expect(screen.getByText(/Created/i)).toBeInTheDocument();
      expect(screen.getByText(/Due Date/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimated time:/i)).toBeInTheDocument();
      expect(screen.getByText(/4 hours/i)).toBeInTheDocument();
      
      // Integrations
      expect(screen.getByTestId('cost-subtotal-wo-1')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions-wo-1')).toBeInTheDocument();
      expect(screen.getByTestId('assignment-hover-wo-1')).toBeInTheDocument();
    });

    it('adapts layout for desktop, mobile, and compact variants', () => {
      const variants = ['desktop', 'mobile', 'compact'] as const;
      
      variants.forEach((variant) => {
        const { unmount } = render(
          <WorkOrderCard
            workOrder={mockWorkOrder}
            variant={variant === 'desktop' ? undefined : variant}
            onNavigate={mockOnNavigate}
          />
        );

        expect(screen.getByText('Test Work Order')).toBeInTheDocument();
        expect(screen.getByText(/in progress/i)).toBeInTheDocument();
        unmount();
      });
    });

    it('displays PM progress indicator when has_pm is true', () => {
      const pmOrder = { ...mockWorkOrder, has_pm: true };

      render(
        <WorkOrderCard
          workOrder={pmOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('pm-progress-wo-1')).toBeInTheDocument();
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
  });

  describe('edge cases', () => {
    it('handles missing optional fields gracefully', () => {
      const minimalOrder = {
        ...mockWorkOrder,
        due_date: null,
        estimated_hours: null,
        equipmentTeamName: undefined,
        teamName: undefined
      };

      render(
        <WorkOrderCard
          workOrder={minimalOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.queryByText(/Due Date/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Estimated time:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Equipment Team/i)).not.toBeInTheDocument();
    });

    it('displays correct state for all status types', () => {
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

    it('displays correct state for all priority types', () => {
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

    it('handles completed date display', () => {
      const completedOrder: WorkOrder = {
        ...mockWorkOrder,
        completed_date: '2024-01-10T00:00:00Z',
        status: 'completed' as const
      };

      render(
        <WorkOrderCard
          workOrder={completedOrder}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Completed:/i)).toBeInTheDocument();
    });
  });

  describe('navigation and accessibility', () => {
    it('calls onNavigate when View Details button is clicked on desktop', () => {
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

    it('calls onNavigate when mobile card is clicked', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
    });

    it('supports keyboard navigation on mobile (Enter and Space keys)', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
          onNavigate={mockOnNavigate}
        />
      );

      const card = screen.getByRole('button');
      
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
      
      vi.clearAllMocks();
      
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnNavigate).toHaveBeenCalledWith('wo-1');
    });

    it('renders without interactive features when onNavigate is undefined', () => {
      render(
        <WorkOrderCard
          workOrder={mockWorkOrder}
          variant="mobile"
        />
      );

      expect(screen.getByText('Test Work Order')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
