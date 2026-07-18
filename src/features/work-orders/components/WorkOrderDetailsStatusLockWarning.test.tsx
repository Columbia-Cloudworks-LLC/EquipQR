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

  it('calls onStatusUpdate with accepted after a successful revert (#1278)', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: /revert to accepted/i }));

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

    await userEvent.click(screen.getByRole('button', { name: /revert to accepted/i }));

    await waitFor(() => {
      expect(mockRevertWorkOrderStatus).toHaveBeenCalled();
    });
    expect(onStatusUpdate).not.toHaveBeenCalled();
  });

  it('hides revert control for non-admins', () => {
    render(
      <WorkOrderDetailsStatusLockWarning
        workOrder={{ id: 'wo-1', status: 'completed' }}
        isWorkOrderLocked
        baseCanAddNotes
        isAdmin={false}
      />,
    );

    expect(screen.getByText(/this work order is completed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /revert to accepted/i })).not.toBeInTheDocument();
  });
});
