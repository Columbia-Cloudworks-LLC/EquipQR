import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { WorkOrderQuickActions } from './WorkOrderQuickActions';

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: () => ({ data: false }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: () => false,
}));

vi.mock('./QuickBooksExportButton', () => ({
  QuickBooksExportButton: () => <div>QB export</div>,
}));

describe('WorkOrderQuickActions', () => {
  const baseProps = {
    workOrderId: 'wo-1',
    workOrderStatus: 'in_progress' as const,
    equipmentTeamId: 'team-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows delete menu item when admin can delete', async () => {
    const onDeleteClick = vi.fn();
    render(
      <WorkOrderQuickActions
        {...baseProps}
        canDelete
        onDeleteClick={onDeleteClick}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Quick actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /delete work order/i }));

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('hides delete menu item when canDelete is false', async () => {
    render(<WorkOrderQuickActions {...baseProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Quick actions' }));

    expect(screen.queryByRole('menuitem', { name: /delete work order/i })).not.toBeInTheDocument();
  });
});
