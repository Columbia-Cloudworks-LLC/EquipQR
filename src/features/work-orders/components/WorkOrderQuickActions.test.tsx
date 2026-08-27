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
    const user = userEvent.setup({ delay: null });
    render(
      <WorkOrderQuickActions
        {...baseProps}
        canDelete
        onDeleteClick={onDeleteClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Quick actions' }));

    const menu = screen.getByRole('menu');
    const deleteItem = screen.getByRole('menuitem', { name: /delete work order/i });

    expect(menu.lastElementChild).toBe(deleteItem);
    expect(deleteItem.previousElementSibling).toHaveAttribute('role', 'separator');

    await user.click(deleteItem);

    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('hides delete menu item when canDelete is false', async () => {
    const user = userEvent.setup({ delay: null });
    render(<WorkOrderQuickActions {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Quick actions' }));

    expect(screen.queryByRole('menuitem', { name: /delete work order/i })).not.toBeInTheDocument();
  });
});
