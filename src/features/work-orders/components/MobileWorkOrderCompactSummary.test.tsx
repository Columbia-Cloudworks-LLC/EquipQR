import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileWorkOrderCompactSummary } from './MobileWorkOrderCompactSummary';

vi.mock('@/features/work-orders/hooks/useWorkOrderInlineFieldSave', () => ({
  useWorkOrderInlineFieldSave: () => ({
    saveField: vi.fn(),
  }),
}));

vi.mock('@/features/work-orders/components/InlineEditWorkOrderAssignee', () => ({
  InlineEditWorkOrderAssignee: () => <div>Assignee editor</div>,
}));

describe('MobileWorkOrderCompactSummary', () => {
  const baseWorkOrder = {
    id: 'wo-1',
    status: 'accepted' as const,
    priority: 'low' as const,
    due_date: '2026-06-23T12:00:00Z',
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
});
