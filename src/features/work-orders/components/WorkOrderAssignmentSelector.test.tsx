import React from 'react';
import { render, screen, fireEvent, within } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderAssignmentSelector from './WorkOrderAssignmentSelector';
import { useWorkOrderContextualAssignment } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { useQuickWorkOrderAssignment } from '@/hooks/useQuickWorkOrderAssignment';

// Mock hooks
const defaultAssignmentOptions = () => ({
  assignmentOptions: [
    { id: 'user-1', name: 'John Doe', type: 'user' as const, role: 'Technician' },
    { id: 'user-2', name: 'Jane Smith', type: 'user' as const, role: 'Manager' }
  ],
  isLoading: false,
  error: null,
  equipmentHasNoTeam: false
});

const idleAssignmentMutation = () =>
  ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    data: undefined,
    error: null,
    isError: false,
    isSuccess: false,
    status: 'idle' as const,
    variables: undefined,
    reset: vi.fn(),
    isIdle: true,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    isPaused: false
  }) as ReturnType<typeof useQuickWorkOrderAssignment>;

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: vi.fn()
}));

vi.mock('@/hooks/useQuickWorkOrderAssignment', () => ({
  useQuickWorkOrderAssignment: vi.fn()
}));

const mockWorkOrder = {
  id: 'wo-1',
  organization_id: 'org-1',
  assignee_id: 'user-1'
};

const openAssignmentOptions = async () => {
  fireEvent.click(screen.getByRole('combobox'));
  return screen.findByRole('listbox');
};

describe('WorkOrderAssignmentSelector', () => {
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkOrderContextualAssignment).mockReturnValue(defaultAssignmentOptions());
    vi.mocked(useQuickWorkOrderAssignment).mockReturnValue(idleAssignmentMutation());
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

    it('marks the current assignee option as Current', async () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      const listbox = await openAssignmentOptions();
      expect(within(listbox).getByRole('option', { name: /John Doe/ })).toHaveTextContent('Current');
      expect(within(listbox).getByRole('option', { name: /Jane Smith/ })).not.toHaveTextContent('Current');
    });

    it('shows unassign option', async () => {
      render(
        <WorkOrderAssignmentSelector
          workOrder={mockWorkOrder}
          organizationId="org-1"
          onCancel={mockOnCancel}
        />
      );

      const listbox = await openAssignmentOptions();
      expect(within(listbox).getByRole('option', { name: /Unassign/ })).toBeInTheDocument();
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
        isPending: true,
        data: undefined,
        error: null,
        isError: false,
        isSuccess: false,
        status: 'pending' as const,
        variables: {
          workOrderId: 'wo-1',
          organizationId: 'org-1',
          assigneeId: 'user-1',
        },
        reset: vi.fn(),
        isIdle: false,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        submittedAt: 0,
        isPaused: false
      } as ReturnType<typeof useQuickWorkOrderAssignment>);

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
        error: null,
        equipmentHasNoTeam: false
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
    it('handles work order without current assignee', async () => {
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

      const listbox = await openAssignmentOptions();
      expect(within(listbox).getByRole('option', { name: /John Doe/ })).toBeInTheDocument();
      expect(within(listbox).queryByText('Current')).not.toBeInTheDocument();
    });

    it('falls back to assigneeId when assignee_id is missing', async () => {
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

      const listbox = await openAssignmentOptions();
      expect(within(listbox).getByRole('option', { name: /Jane Smith/ })).toHaveTextContent('Current');
      expect(within(listbox).getByRole('option', { name: /John Doe/ })).not.toHaveTextContent('Current');
    });
  });
});

