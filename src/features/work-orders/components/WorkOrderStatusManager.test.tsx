import React from 'react';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkOrderStatusManager from './WorkOrderStatusManager';
import { useWorkOrderContextualAssignment } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import { useWorkOrderStatusChangeHandlers } from '@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers';

const {
  mockMutateAsync,
  mockHandleStatusChange,
  mockHandleAcceptanceComplete,
} = vi.hoisted(() => ({
  mockMutateAsync: vi.fn().mockResolvedValue(undefined),
  mockHandleStatusChange: vi.fn(),
  mockHandleAcceptanceComplete: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers', () => ({
  useWorkOrderStatusChangeHandlers: vi.fn(() => ({
    updateStatusMutation: { isPending: false, mutateAsync: mockMutateAsync },
    acceptanceMutation: { isPending: false, mutateAsync: vi.fn() },
    pmData: null,
    isManager: true,
    isTechnician: false,
    canPerformStatusActions: () => true,
    canCompleteWorkOrder: () => true,
    handleStatusChange: mockHandleStatusChange,
    handleAcceptanceComplete: mockHandleAcceptanceComplete,
  })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: vi.fn(() => ({
    assignmentOptions: [
      { id: 'user-1', name: 'Nicholas King', role: 'Owner' },
      { id: 'user-2', name: 'Jane Smith', role: 'Technician' },
    ],
    isLoading: false,
    equipmentHasNoTeam: false,
  })),
}));

vi.mock('./WorkOrderAcceptanceModal', () => ({
  default: () => null,
}));

vi.mock('./WorkOrderAssigneeDisplay', () => ({
  default: () => <div>Assignment card</div>,
}));

type TestWorkOrderOverrides = Partial<React.ComponentProps<typeof WorkOrderStatusManager>['workOrder']>;

function renderStatusManager(workOrderOverrides: TestWorkOrderOverrides = {}) {
  render(
    <WorkOrderStatusManager
      organizationId="org-1"
      workOrder={{
        id: 'wo-1',
        status: 'accepted',
        assignee_id: null,
        assigneeName: null,
        created_by: 'creator-1',
        organization_id: 'org-1',
        equipment_id: 'eq-1',
        equipmentTeamId: 'team-1',
        ...workOrderOverrides,
      }}
    />,
  );
}

describe('WorkOrderStatusManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkOrderStatusChangeHandlers).mockReturnValue({
      updateStatusMutation: { isPending: false, mutateAsync: mockMutateAsync },
      acceptanceMutation: { isPending: false, mutateAsync: vi.fn() },
      pmData: null,
      isManager: true,
      isTechnician: false,
      canPerformStatusActions: () => true,
      canCompleteWorkOrder: () => true,
      handleStatusChange: mockHandleStatusChange,
      handleAcceptanceComplete: mockHandleAcceptanceComplete,
    });
    vi.mocked(useWorkOrderContextualAssignment).mockReturnValue({
      assignmentOptions: [
        { id: 'user-1', name: 'Nicholas King', role: 'Owner' },
        { id: 'user-2', name: 'Jane Smith', role: 'Technician' },
      ],
      isLoading: false,
      equipmentHasNoTeam: false,
    });
  });

  it('enables Start Work for accepted work orders that already have an assignee', async () => {
    renderStatusManager({
      assignee_id: 'user-1',
      assigneeName: 'Nicholas King',
    });

    expect(screen.queryByText('Assign to start work')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: /select assignee to start work/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/select an assignee to enable starting work/i),
    ).not.toBeInTheDocument();

    const startWorkButton = screen.getByRole('button', { name: /^start work$/i });
    expect(startWorkButton).toBeEnabled();

    fireEvent.click(startWorkButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        workOrderId: 'wo-1',
        status: 'in_progress',
        organizationId: 'org-1',
        assigneeId: 'user-1',
      });
    });
  });

  it('keeps Start Work disabled for truly unassigned accepted work orders', () => {
    renderStatusManager();

    expect(screen.getByText('Assign to start work')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /select assignee to start work/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/select an assignee to enable starting work/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start work$/i })).toBeDisabled();
  });
});
