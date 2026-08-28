import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import { WorkOrderDetailsStatusLockWarning } from './WorkOrderDetailsStatusLockWarning';

const mockToast = vi.fn();
const mockRevertWorkOrderStatus = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/features/work-orders/services/workOrderRevertService', () => ({
  workOrderRevertService: {
    revertWorkOrderStatus: (...args: unknown[]) => mockRevertWorkOrderStatus(...args),
  },
}));

describe('WorkOrderDetailsStatusLockWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows helper copy, the new label, and requires confirmation before reopening', async () => {
    render(
      <WorkOrderDetailsStatusLockWarning
        workOrder={{ id: 'wo-1', status: 'completed' }}
        isWorkOrderLocked
        baseCanAddNotes
        isAdmin
      />,
    );

    expect(
      screen.getByText(/need to edit the work order without changing the pm checklist\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the pm stays completed\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reopen work order/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /revert to accepted/i }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reopen work order/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/the pm checklist stays completed\./i)).toBeInTheDocument();
    expect(mockRevertWorkOrderStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(mockRevertWorkOrderStatus).not.toHaveBeenCalled();
  });

  it('calls onStatusUpdate with accepted after a successful reopen confirmation (#1278)', async () => {
    const onStatusUpdate = vi.fn();
    mockRevertWorkOrderStatus.mockResolvedValue({
      success: true,
      old_status: 'completed',
      new_status: 'accepted',
    });

    render(
      <WorkOrderDetailsStatusLockWarning
        workOrder={{ id: 'wo-1', status: 'completed' }}
        isWorkOrderLocked
        baseCanAddNotes
        isAdmin
        onStatusUpdate={onStatusUpdate}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /reopen work order/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, reopen work order/i }));

    await waitFor(() => {
      expect(mockRevertWorkOrderStatus).toHaveBeenCalledWith(
        'wo-1',
        'Reverted to accepted status by admin',
      );
      expect(onStatusUpdate).toHaveBeenCalledWith('accepted');
    });
  });

  it('does not call onStatusUpdate when revert fails', async () => {
    const onStatusUpdate = vi.fn();
    mockRevertWorkOrderStatus.mockResolvedValue({
      success: false,
      error: 'Not allowed',
    });

    render(
      <WorkOrderDetailsStatusLockWarning
        workOrder={{ id: 'wo-1', status: 'completed' }}
        isWorkOrderLocked
        baseCanAddNotes
        isAdmin
        onStatusUpdate={onStatusUpdate}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /reopen work order/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, reopen work order/i }));

    await waitFor(() => {
      expect(mockRevertWorkOrderStatus).toHaveBeenCalled();
    });
    expect(onStatusUpdate).not.toHaveBeenCalled();
  });

  it('hides reopen control for non-admins', () => {
    render(
      <WorkOrderDetailsStatusLockWarning
        workOrder={{ id: 'wo-1', status: 'completed' }}
        isWorkOrderLocked
        baseCanAddNotes
        isAdmin={false}
      />,
    );

    expect(screen.getByText(/this work order is completed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reopen work order/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/need to edit the work order without changing the pm checklist\?/i),
    ).not.toBeInTheDocument();
  });
});
