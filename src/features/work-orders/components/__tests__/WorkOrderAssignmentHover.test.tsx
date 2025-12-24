import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderAssignmentHover } from '../WorkOrderAssignmentHover';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: vi.fn(() => ({
    assignmentOptions: [
      { id: 'user-1', name: 'John Doe', role: 'Technician' },
      { id: 'user-2', name: 'Jane Smith', role: 'Manager' }
    ],
    isLoading: false,
    hasTeamAssignment: false
  }))
}));

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  }))
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

const mockWorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  assignee_id: 'user-1'
};

describe('WorkOrderAssignmentHover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders children when not disabled', () => {
      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <div data-testid="child-content">Child Content</div>
        </WorkOrderAssignmentHover>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders children directly when disabled', () => {
      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder} disabled={true}>
          <div data-testid="child-content">Child Content</div>
        </WorkOrderAssignmentHover>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('opens popover when trigger is clicked', async () => {
      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Hover Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Quick Assign/i)).toBeInTheDocument();
      });
    });
  });

  describe('Assignment Actions', () => {
    it('shows unassign option when work order is assigned', async () => {
      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Unassign/i)).toBeInTheDocument();
      });
    });

    it('shows assign options when work order is unassigned', async () => {
      const unassignedOrder = {
        ...mockWorkOrder,
        assignee_id: null
      };

      render(
        <WorkOrderAssignmentHover workOrder={unassignedOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Quick Assign/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing organization ID gracefully', async () => {
      const { useToast } = await import('@/hooks/use-toast');
      const mockToast = vi.fn();
      
      vi.mocked(useToast).mockReturnValue({
        toast: mockToast
      });

      const orderWithoutOrg = {
        ...mockWorkOrder,
        organization_id: undefined,
        organizationId: undefined
      };

      render(
        <WorkOrderAssignmentHover workOrder={orderWithoutOrg}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      // Component should handle missing org gracefully
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });
  });
});

