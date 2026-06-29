import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoricalTimelineEditor } from '@/features/work-orders/components/HistoricalTimelineEditor';
import {
  createInitialTimelineRow,
  type HistoricalTimelineEditorRow,
} from '@/features/work-orders/utils/historicalTimeline';

vi.mock('@/features/work-orders/hooks/useWorkOrderContextualAssignment', () => ({
  useWorkOrderContextualAssignment: () => ({
    assignmentOptions: [{ id: 'user-1', name: 'Alex Tech', role: 'technician' }],
    isLoading: false,
    equipmentHasNoTeam: false,
  }),
}));

describe('HistoricalTimelineEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs rows when initialEvents change after mount', () => {
    const { rerender } = render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={[
          {
            newStatus: 'submitted',
            changedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('Event 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Event 2')).not.toBeInTheDocument();

    rerender(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={[
          {
            newStatus: 'submitted',
            changedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
          },
          {
            newStatus: 'accepted',
            changedAt: new Date('2024-01-02T08:00:00Z').toISOString(),
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('Event 2')).toBeInTheDocument();
  });

  it('limits selectable statuses to the previous row in the chain', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={[
          {
            newStatus: 'submitted',
            changedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
          },
          {
            newStatus: 'accepted',
            changedAt: new Date('2024-01-02T08:00:00Z').toISOString(),
          },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Add next status event')).toBeInTheDocument();
    await user.click(screen.getByText('Add next status event'));
    expect(onChange).toHaveBeenCalled();
  });

  it('clears downstream rows when an upstream status changes', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02'),
        reason: '',
        assigneeId: null,
      },
      {
        id: 'row-3',
        newStatus: 'assigned',
        changedAt: new Date('2024-01-03'),
        reason: '',
        assigneeId: 'user-1',
      },
    ];

    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={[
          { newStatus: 'submitted', changedAt: rows[0].changedAt!.toISOString() },
          { newStatus: 'accepted', changedAt: rows[1].changedAt!.toISOString() },
          { newStatus: 'assigned', changedAt: rows[2].changedAt!.toISOString(), assigneeId: 'user-1' },
        ]}
      />,
    );

    expect(screen.getByText('Assignee')).toBeInTheDocument();
  });
});
