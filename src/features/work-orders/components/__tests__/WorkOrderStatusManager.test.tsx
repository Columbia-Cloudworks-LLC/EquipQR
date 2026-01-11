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

vi.mock('../WorkOrderAcceptanceModal', () => ({
  default: ({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept: () => void }) => (
    open ? (
      <div data-testid="acceptance-modal">
        <button data-testid="accept-button" onClick={onAccept}>Accept</button>
        <button data-testid="close-button" onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../WorkOrderAssigneeDisplay', () => ({
  default: ({ workOrder }: { workOrder: { assigneeName?: string | null } }) => (
    <div data-testid="assignee-display">{workOrder.assigneeName || 'Unassigned'}</div>
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

const mockOrganizationId = 'org-1';

describe('WorkOrderStatusManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status display and actions', () => {
    it('displays current status and shows correct actions for each status type', () => {
      const statusActions = {
        'submitted': [/Accept/i, /Cancel/i],
        'accepted': [/Assign & Start/i, /Cancel/i],
        'assigned': [/Start Work/i, /Put on Hold/i],
        'in_progress': [/Complete/i, /Put on Hold/i],
        'on_hold': [/Resume/i, /Cancel/i]
      } as const;

      Object.entries(statusActions).forEach(([status, expectedActions]) => {
        const { unmount } = render(
          <WorkOrderStatusManager
            workOrder={{ ...mockWorkOrder, status: status as typeof mockWorkOrder.status }}
            organizationId={mockOrganizationId}
          />
        );

        expect(screen.getByText(/Current Status:/i)).toBeInTheDocument();
        
        expectedActions.forEach(action => {
          expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
        });
        
        unmount();
      });
    });

    it('shows completion message for completed status with date', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'completed', completed_date: '2024-01-10T00:00:00Z' }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText(/Work order completed successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed on/i)).toBeInTheDocument();
    });
  });

  describe('status transitions', () => {
    it('opens acceptance modal and updates status when accept flow completes', async () => {
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

      // Open modal
      fireEvent.click(screen.getByRole('button', { name: /Accept/i }));

      await waitFor(() => {
        expect(screen.getByTestId('acceptance-modal')).toBeInTheDocument();
      });

      // Confirm accept
      fireEvent.click(screen.getByTestId('accept-button'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workOrderId: 'wo-1',
          status: 'accepted',
          organizationId: mockOrganizationId
        });
      });
    });

    it('calls status update when cancel button is clicked', async () => {
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

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workOrderId: 'wo-1',
          status: 'cancelled',
          organizationId: mockOrganizationId
        });
      });
    });
  });

  describe('PM checklist integration', () => {
    it('disables complete button when PM is not completed and shows warning', async () => {
      const { usePMByWorkOrderId } = await import('@/features/pm-templates/hooks/usePMData');
      
      vi.mocked(usePMByWorkOrderId).mockReturnValue({
        data: { id: 'pm-1', status: 'in_progress', work_order_id: 'wo-1' },
        isLoading: false,
        isError: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress', has_pm: true }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByRole('button', { name: /Complete/i })).toBeDisabled();
      expect(screen.getByText(/Complete the PM checklist/i)).toBeInTheDocument();
    });

    it('enables complete button when PM is completed', async () => {
      const { usePMByWorkOrderId } = await import('@/features/pm-templates/hooks/usePMData');
      
      vi.mocked(usePMByWorkOrderId).mockReturnValue({
        data: { id: 'pm-1', status: 'completed', work_order_id: 'wo-1' },
        isLoading: false,
        isError: false
      });

      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, status: 'in_progress', has_pm: true }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByRole('button', { name: /Complete/i })).not.toBeDisabled();
    });
  });

  describe('permission checks', () => {
    it('shows permission message when user cannot perform actions', async () => {
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

    it('allows creator to cancel their own work order', async () => {
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

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
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

  describe('assignment display and loading states', () => {
    it('displays assignee and team information correctly', () => {
      render(
        <WorkOrderStatusManager
          workOrder={mockWorkOrder}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByTestId('assignee-display')).toHaveTextContent('John Doe');
      expect(screen.getByText(/Assigned to: John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Team: Maintenance Team/i)).toBeInTheDocument();
    });

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

      expect(screen.getByRole('button', { name: /Accept/i })).toBeDisabled();
    });

    it('handles work order without assignee or team', () => {
      render(
        <WorkOrderStatusManager
          workOrder={{ ...mockWorkOrder, assignee_id: null, assigneeName: undefined, teamName: undefined }}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByTestId('assignee-display')).toHaveTextContent('Unassigned');
      expect(screen.queryByText(/Team:/i)).not.toBeInTheDocument();
    });
  });
});
