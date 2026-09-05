import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileWorkOrderCompactSummary } from './MobileWorkOrderCompactSummary';

const { saveField, savePatch } = vi.hoisted(() => ({
  saveField: vi.fn(),
  savePatch: vi.fn(),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderInlineFieldSave', () => ({
  useWorkOrderInlineFieldSave: () => ({
    saveField,
    savePatch,
  }),
}));

vi.mock('@/features/work-orders/components/InlineEditWorkOrderAssignee', () => ({
  InlineEditWorkOrderAssignee: () => <div>Assignee editor</div>,
}));

describe('MobileWorkOrderCompactSummary', () => {
  beforeEach(() => {
    saveField.mockClear();
    savePatch.mockClear();
  });

  const baseWorkOrder = {
    id: 'wo-1',
    status: 'accepted' as const,
    priority: 'low' as const,
    due_date: '2026-06-23T12:00:00Z',
    due_date_has_time: false,
    assignee_id: 'user-1',
    updated_at: '2026-06-01T12:00:00Z',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    equipmentTeamId: 'team-1',
  };

  it('labels status, priority, and due date without badges', () => {
    render(
      <MobileWorkOrderCompactSummary
        workOrder={baseWorkOrder}
        assignee={{ name: 'Nicholas King' }}
        organizationId="org-1"
      />,
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Due date')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('opens status change when the status row is tapped', async () => {
    const user = userEvent.setup();
    const onStatusPress = vi.fn();

    render(
      <MobileWorkOrderCompactSummary
        workOrder={baseWorkOrder}
        organizationId="org-1"
        canChangeStatus
        onStatusPress={onStatusPress}
      />,
    );

    await user.click(screen.getByRole('button', { name: /status: accepted\. change status/i }));

    expect(onStatusPress).toHaveBeenCalledTimes(1);
  });

  it('renders completed status as a non-interactive row', () => {
    render(
      <MobileWorkOrderCompactSummary
        workOrder={{ ...baseWorkOrder, status: 'completed' }}
        organizationId="org-1"
      />,
    );

    expect(screen.getByLabelText('Status: Completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /status/i })).not.toBeInTheDocument();
  });

  it('lets the overdue invoice badge wrap within the invoice row', () => {
    render(
      <MobileWorkOrderCompactSummary
        workOrder={{
          ...baseWorkOrder,
          invoice_status: 'overdue',
          quickbooks_invoice_number: 'WO-4C387D1F',
          invoice_balance_cents: 100000,
        }}
        organizationId="org-1"
      />,
    );

    const badge = screen.getByText('Invoice Overdue - $1000.00 - #WO-4C387D1F');
    expect(badge).toHaveClass(
      'min-w-0',
      'max-w-full',
      'whitespace-normal',
      'text-left',
      'leading-4',
    );
    expect(badge.parentElement).toHaveClass('flex-wrap', 'items-start');
  });

  it('saves a date-only edit without dropping a timed clock', async () => {
    const user = userEvent.setup({ delay: null });
    const dueAt = new Date(2026, 5, 23, 12, 0, 0, 0);

    render(
      <MobileWorkOrderCompactSummary
        workOrder={{
          ...baseWorkOrder,
          due_date: dueAt.toISOString(),
          due_date_has_time: true,
        }}
        organizationId="org-1"
        canEditFields
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit due date' }));
    fireEvent.change(screen.getByDisplayValue('2026-06-23'), { target: { value: '2026-06-25' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(savePatch).toHaveBeenCalledWith(expect.objectContaining({
      dueDateHasTime: true,
    }));
    const saved = savePatch.mock.calls[0]?.[0] as { dueDate?: string };
    const next = new Date(String(saved.dueDate));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(25);
    expect(next.getHours()).toBe(12);
    expect(next.getMinutes()).toBe(0);
  });
});
