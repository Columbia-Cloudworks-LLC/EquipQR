import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderStatusManager from '../WorkOrderStatusManager';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderData', () => ({
  useUpdateWorkOrderStatus: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/features/pm-templates/hooks/usePMData', () => ({
  usePMByWorkOrderId: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPermissionLevels', () => ({
  useWorkOrderPermissionLevels: vi.fn(() => ({
    isManager: true,
    isTechnician: false
  }))
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User' }
  }))
}));

// Mock sub-components
vi.mock('../WorkOrderAcceptanceModal', () => ({
  default: ({ open, onClose, onAccept }: any) => (
    open ? (
      <div data-testid="acceptance-modal">
        <button data-testid="accept-button" onClick={onAccept}>Accept</button>
        <button data-testid="close-button" onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../WorkOrderAssigneeDisplay', () => ({
  default: ({ workOrder }: any) => (
    <div data-testid="assignee-display">
      {workOrder.assigneeName || 'Unassigned'}
    </div>
  )
}));

const mockWorkOrder = {
  id: 'wo-1',
  status: 'submitted' as const,
  has_pm: false,
  assignee_id: 'user-1',
  created_by: 'user-2',
  assigneeName: 'John Doe',
  teamName: 'Maintenance Team',
  acceptance_date: null,
  completed_date: null
};

describe('WorkOrderStatusManager', () => {
  const mockOrganizationId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Display', () => {
    it('renders current status badge', () => {
      render(
        <WorkOrderStatusManager
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Current Status:/i)).toBeInTheDocument();
      expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
    });

    it('displays correct status color for each status', () => {
      const statuses = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

      statuses.forEach((status) => {
        const { unmount } = render(
          <WorkOrderStatusManager
            workOrder={{ ...mockWorkOrder, status }}
            organizationId={mockOrganizationId}
          />
        );

        expect(screen.getByText(new RegExp(status.replace('_', ' '), 'i'))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Status Actions - Submitted', () => {
    it('shows accept and cancel actions for submitted status when user is manager', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Available Actions:/i)).toBeInTheDocument();
      expect(screen.getByText(/Accept/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });

    it('opens acceptance modal when accept is clicked', async () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      const acceptButton = screen.getByText(/Accept/i).closest('button');
      if (acceptButton) {
        fireEvent.click(acceptButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('acceptance-modal')).toBeInTheDocument();
      });
    });

    it('calls status update when cancel is clicked', async () => {
      const { useUpdateWorkOrderStatus } = await import('@/features/work-orders/hooks/useWorkOrderData');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useUpdateWorkOrderStatus).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      const cancelButton = screen.getByText(/Cancel/i).closest('button');
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workOrderId: 'wo-1',
          status: 'cancelled',
          organizationId: mockOrganizationId
        });
      });
    });
  });

  describe('Status Actions - Accepted', () => {
    it('shows assign & start and cancel actions for accepted status', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'accepted' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Assign & Start/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });

    it('updates status to in_progress when assign & start is clicked', async () => {
      const { useUpdateWorkOrderStatus } = await import('@/features/work-orders/hooks/useWorkOrderData');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useUpdateWorkOrderStatus).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'accepted' }}
          organizationId={mockOrganizationId}
        />
      );

      const assignButton = screen.getByText(/Assign & Start/i).closest('button');
      if (assignButton) {
        fireEvent.click(assignButton);
      }

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workOrderId: 'wo-1',
          status: 'in_progress',
          organizationId: mockOrganizationId
        });
      });
    });
  });

  describe('Status Actions - Assigned', () => {
    it('shows start work and put on hold actions for assigned status', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'assigned' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Start Work/i)).toBeInTheDocument();
      expect(screen.getByText(/Put on Hold/i)).toBeInTheDocument();
    });
  });

  describe('Status Actions - In Progress', () => {
    it('shows complete and put on hold actions for in_progress status', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Complete/i)).toBeInTheDocument();
      expect(screen.getByText(/Put on Hold/i)).toBeInTheDocument();
    });

    it('disables complete button when PM is not completed', async () => {
      const { usePMByWorkOrderId } = await import('@/features/pm-templates/hooks/usePMData');
      
      vi.mocked(usePMByWorkOrderId).mockReturnValue({
        data: {
          id: 'pm-1',
          status: 'in_progress',
          work_order_id: 'wo-1'
        },
        isLoading: false,
        isError: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress', has_pm: true }}
          organizationId={mockOrganizationId}
        />
      );

      const completeButton = screen.getByText(/Complete/i).closest('button');
      expect(completeButton).toBeDisabled();
    });

    it('enables complete button when PM is completed', async () => {
      const { usePMByWorkOrderId } = await import('@/features/pm-templates/hooks/usePMData');
      
      vi.mocked(usePMByWorkOrderId).mockReturnValue({
        data: {
          id: 'pm-1',
          status: 'completed',
          work_order_id: 'wo-1'
        },
        isLoading: false,
        isError: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress', has_pm: true }}
          organizationId={mockOrganizationId}
        />
      );

      const completeButton = screen.getByText(/Complete/i).closest('button');
      expect(completeButton).not.toBeDisabled();
    });

    it('shows PM warning when PM is not completed', async () => {
      const { usePMByWorkOrderId } = await import('@/features/pm-templates/hooks/usePMData');
      
      vi.mocked(usePMByWorkOrderId).mockReturnValue({
        data: {
          id: 'pm-1',
          status: 'in_progress',
          work_order_id: 'wo-1'
        },
        isLoading: false,
        isError: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress', has_pm: true }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Complete the PM checklist/i)).toBeInTheDocument();
    });
  });

  describe('Status Actions - On Hold', () => {
    it('shows resume and cancel actions for on_hold status', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'on_hold' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Resume/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });
  });

  describe('Status Actions - Completed', () => {
    it('shows completion message for completed status', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'completed', completed_date: '2024-01-10T00:00:00Z' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Work order completed successfully/i)).toBeInTheDocument();
    });

    it('displays completion date when available', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'completed', completed_date: '2024-01-10T00:00:00Z' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Completed on/i)).toBeInTheDocument();
    });
  });

  describe('Permission Checks', () => {
    it('shows permission message when user cannot perform status actions', async () => {
      const { useWorkOrderPermissionLevels } = await import('@/features/work-orders/hooks/useWorkOrderPermissionLevels');
      const { useAuth } = await import('@/hooks/useAuth');
      
      vi.mocked(useWorkOrderPermissionLevels).mockReturnValue({
        isManager: false,
        isTechnician: false
      });

      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-3', name: 'Other User' }
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted', created_by: 'user-2' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });

    it('allows creator to cancel their own submitted work order', async () => {
      const { useWorkOrderPermissionLevels } = await import('@/features/work-orders/hooks/useWorkOrderPermissionLevels');
      const { useAuth } = await import('@/hooks/useAuth');
      
      vi.mocked(useWorkOrderPermissionLevels).mockReturnValue({
        isManager: false,
        isTechnician: false
      });

      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-2', name: 'Creator' }
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted', created_by: 'user-2' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });

    it('allows assigned technician to change status', async () => {
      const { useWorkOrderPermissionLevels } = await import('@/features/work-orders/hooks/useWorkOrderPermissionLevels');
      const { useAuth } = await import('@/hooks/useAuth');
      
      vi.mocked(useWorkOrderPermissionLevels).mockReturnValue({
        isManager: false,
        isTechnician: true
      });

      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', name: 'Technician' }
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'assigned', assignee_id: 'user-1' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Start Work/i)).toBeInTheDocument();
    });
  });

  describe('Assignment Display', () => {
    it('renders assignee display component', () => {
      render(
        <WorkOrderStatusManager
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByTestId('assignee-display')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays assignee name when assigned', () => {
      render(
        <WorkOrderStatusManager
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Assigned to: John Doe/i)).toBeInTheDocument();
    });

    it('displays team name when assigned to team', () => {
      render(
        <WorkOrderStatusManager
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Team: Maintenance Team/i)).toBeInTheDocument();
    });
  });

  describe('Acceptance Modal', () => {
    it('closes modal when close button is clicked', async () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      const acceptButton = screen.getByText(/Accept/i).closest('button');
      if (acceptButton) {
        fireEvent.click(acceptButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('acceptance-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('acceptance-modal')).not.toBeInTheDocument();
      });
    });

    it('calls status update when accept is confirmed in modal', async () => {
      const { useUpdateWorkOrderStatus } = await import('@/features/work-orders/hooks/useWorkOrderData');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useUpdateWorkOrderStatus).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      const acceptButton = screen.getByText(/Accept/i).closest('button');
      if (acceptButton) {
        fireEvent.click(acceptButton);
      }

      await waitFor(() => {
        expect(screen.getByTestId('acceptance-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('accept-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workOrderId: 'wo-1',
          status: 'accepted',
          organizationId: mockOrganizationId
        });
      });
    });
  });

  describe('Loading States', () => {
    it('disables buttons when mutation is pending', async () => {
      const { useUpdateWorkOrderStatus } = await import('@/features/work-orders/hooks/useWorkOrderData');
      
      vi.mocked(useUpdateWorkOrderStatus).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'submitted' }}
          organizationId={mockOrganizationId}
        />
      );

      const acceptButton = screen.getByText(/Accept/i).closest('button');
      expect(acceptButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles work order without PM', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, has_pm: false }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Current Status:/i)).toBeInTheDocument();
    });

    it('handles work order without assignee', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, assignee_id: null, assigneeName: undefined }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByTestId('assignee-display')).toHaveTextContent('Unassigned');
    });

    it('handles work order without team', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, teamName: undefined }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.queryByText(/Team:/i)).not.toBeInTheDocument();
    });
  });
});

