import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderAssignmentHover } from '../WorkOrderAssignmentHover';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: vi.fn(() => ({
    assignmentOptions: [
      { id: 'user-1', name: 'John Doe', role: 'technician' },
      { id: 'user-2', name: 'Jane Admin', role: 'admin' }
    ],
    isLoading: false,
    equipmentHasNoTeam: false
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
  equipment_id: 'eq-1',
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
        expect(screen.getByText(/Quick Assignment/i)).toBeInTheDocument();
      });
    });

    it('shows assignment rules description', async () => {
      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/team members \+ org admins/i)).toBeInTheDocument();
      });
    });
  });

  describe('Equipment Has No Team (Blocked State)', () => {
    it('shows warning when equipment has no team', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: null,
        equipmentHasNoTeam: true
      });

      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/No team assigned to equipment/i)).toBeInTheDocument();
      });
    });

    it('does not show assign options when equipment has no team', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: null,
        equipmentHasNoTeam: true
      });

      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.queryByText(/Unassign/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Assignment Actions', () => {
    it('shows unassign option when work order is assigned', async () => {
      // Reset the mock to provide valid options
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [
          { id: 'user-1', name: 'John Doe', role: 'technician' },
          { id: 'user-2', name: 'Jane Admin', role: 'admin' }
        ],
        isLoading: false,
        error: null,
        equipmentHasNoTeam: false
      });

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
        expect(screen.getByText(/Quick Assignment/i)).toBeInTheDocument();
      });
    });

    it('shows both team members and admins in assignee list', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [
          { id: 'user-1', name: 'John Technician', role: 'technician' },
          { id: 'user-2', name: 'Jane Admin', role: 'admin' }
        ],
        isLoading: false,
        error: null,
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      // Open the select dropdown
      await waitFor(() => {
        const select = screen.getByRole('combobox');
        fireEvent.click(select);
      });

      await waitFor(() => {
        expect(screen.getByText(/John Technician/i)).toBeInTheDocument();
        expect(screen.getByText(/Jane Admin/i)).toBeInTheDocument();
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

    it('shows loading state when options are loading', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [],
        isLoading: true,
        error: null,
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/Loading options/i)).toBeInTheDocument();
      });
    });

    it('shows no assignees message when options are empty', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [],
        isLoading: false,
        error: null,
        equipmentHasNoTeam: false
      });

      render(
        <WorkOrderAssignmentHover workOrder={mockWorkOrder}>
          <button data-testid="trigger">Trigger</button>
        </WorkOrderAssignmentHover>
      );

      const trigger = screen.getByTestId('trigger');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/No assignees available/i)).toBeInTheDocument();
      });
    });
  });
});
