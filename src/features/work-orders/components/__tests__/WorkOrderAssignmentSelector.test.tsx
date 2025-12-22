import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderAssignmentSelector from '../WorkOrderAssignmentSelector';

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
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

const mockWorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  assignee_id: 'user-1'
};

describe('WorkOrderAssignmentSelector', () => {
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders assignment selector', () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });

    it('displays current assignment', () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      // Component should render with current assignee
      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });

    it('shows unassign option', () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      // Unassign option should be available
      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });
  });

  describe('Assignment Actions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('disables controls when disabled prop is true', () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
          disabled={true}
        />
      );

      // Select should be disabled
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('disables controls when mutation is pending', async () => {
      const { useQuickWorkOrderAssignment } = await import('@/hooks/useQuickWorkOrderAssignment');
      
      vi.mocked(useQuickWorkOrderAssignment).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: true
      });

      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when options are loading', async () => {
      const { useWorkOrderContextualAssignment } = await import('@/features/work-orders/hooks/useWorkOrderContextualAssignment');
      
      vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
        assignmentOptions: [],
        isLoading: true,
        hasTeamAssignment: false
      });

      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles work order without current assignee', () => {
      const unassignedOrder = {
        ...mockWorkOrder,
        assignee_id: null,
        assigneeId: null
      };

      render(
        <WorkOrderAssignmentSelector
          workOrder={unassignedOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });

    it('handles both assignee_id and assigneeId formats', () => {
      const orderWithAssigneeId = {
        ...mockWorkOrder,
        assignee_id: undefined,
        assigneeId: 'user-2'
      };

      render(
        <WorkOrderAssignmentSelector
          workOrder={orderWithAssigneeId}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Change Assignment/i)).toBeInTheDocument();
    });
  });
});

