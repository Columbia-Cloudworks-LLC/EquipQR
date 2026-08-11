import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoricalTimelineEditor } from '@/features/work-orders/components/HistoricalTimelineEditor';
import { HistoricalTimelineEditorDialog } from '@/features/work-orders/components/HistoricalTimelineEditorDialog';
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

vi.mock('@/features/work-orders/hooks/useHistoricalWorkOrders', () => ({
  useReplaceHistoricalWorkOrderTimeline: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useConvertWorkOrderToHistorical: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPermissionLevels', () => ({
  useWorkOrderPermissionLevels: () => ({
    isManager: true,
  }),
}));

const submittedAcceptedEvents = [
  {
    newStatus: 'submitted' as const,
    changedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
  },
  {
    newStatus: 'accepted' as const,
    changedAt: new Date('2024-01-02T08:00:00Z').toISOString(),
  },
];

const completedTimelineEvents = [
  {
    newStatus: 'submitted' as const,
    changedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
  },
  {
    newStatus: 'accepted' as const,
    changedAt: new Date('2024-01-02T08:00:00Z').toISOString(),
  },
  {
    newStatus: 'assigned' as const,
    changedAt: new Date('2024-01-03T08:00:00Z').toISOString(),
    assigneeId: 'user-1',
  },
  {
    newStatus: 'in_progress' as const,
    changedAt: new Date('2024-01-04T08:00:00Z').toISOString(),
  },
  {
    newStatus: 'completed' as const,
    changedAt: new Date('2024-01-05T08:00:00Z').toISOString(),
  },
];

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

    expect(screen.getByLabelText('Timeline step 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove timeline event 2/i })).not.toBeInTheDocument();

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

    expect(screen.getByRole('button', { name: /remove timeline event 2/i })).toBeInTheDocument();
  });

  it('limits selectable statuses to the previous row in the chain', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText('Timeline step 1')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /operational timeline events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add event/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /add event/i }));
    expect(onChange).toHaveBeenCalled();
  });

  it('shows numbered step indicators for each timeline event', () => {
    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    expect(screen.getByLabelText('Timeline step 1')).toBeInTheDocument();
    const removeStep2 = screen.getByRole('button', { name: /remove timeline event 2/i });
    expect(removeStep2).toHaveTextContent('2');
  });

  it('shows contextual terminal-status guidance instead of an add control when the chain ends', () => {
    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={completedTimelineEvents}
      />,
    );

    expect(screen.queryByRole('button', { name: /add event/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: /timeline ended at terminal status/i }),
    ).toBeInTheDocument();
  });

  it('clears downstream rows when an upstream status changes', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02'),
        assigneeId: null,
      },
      {
        id: 'row-3',
        newStatus: 'assigned',
        changedAt: new Date('2024-01-03'),
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

  it('does not render reason fields for timeline events', () => {
    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    expect(screen.queryByLabelText(/^Reason$/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/optional note about this status change/i)).not.toBeInTheDocument();
  });

  it('copies the previous event timestamp when adding a new row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add event/i }));

    const latestEvents = onChange.mock.calls.at(-1)?.[0];
    expect(latestEvents).toHaveLength(2);
    expect(latestEvents?.[1]?.changedAt).toBe(submittedAcceptedEvents[1].changedAt);
  });

  it('renders date/time shortcuts in the timeline editor', async () => {
    const user = userEvent.setup();

    render(
      <HistoricalTimelineEditor
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    await user.click(screen.getByRole('button', { name: /January 1st, 2024/i }));

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Now' })).toBeInTheDocument();
  });
});

describe('HistoricalTimelineEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a newly added status event row visible in create mode', async () => {
    const user = userEvent.setup();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={vi.fn()}
        workOrderId="create-mode"
        organizationId="org-1"
        equipmentId="equipment-1"
        title="Build historical timeline"
        mode="create"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    expect(screen.getByLabelText('Timeline step 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove timeline event 2/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove timeline event 3/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add event/i }));

    expect(screen.getByRole('button', { name: /remove timeline event 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save timeline/i })).toBeDisabled();
  });

  it('seeds editor state when history rows arrive after the dialog opens', async () => {
    const historyRows = [
      {
        new_status: 'submitted',
        changed_at: '2024-01-01T08:00:00.000Z',
        reason: 'Created',
        metadata: null,
      },
      {
        new_status: 'accepted',
        changed_at: '2024-01-02T08:00:00.000Z',
        reason: 'Accepted',
        metadata: null,
      },
    ];

    const { rerender } = render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={vi.fn()}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        historyRows={[]}
        historyReady={false}
      />,
    );

    rerender(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={vi.fn()}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        historyRows={historyRows}
        historyReady
      />,
    );

    expect(screen.getByRole('button', { name: /remove timeline event 2/i })).toBeInTheDocument();
  });

  it('does not close when cancel is clicked with incomplete rows', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={onOpenChange}
        workOrderId="create-mode"
        organizationId="org-1"
        equipmentId="equipment-1"
        mode="create"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add event/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows an in-app discard confirmation when closing with unsaved valid edits', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={onOpenChange}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove timeline event 2/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/discard timeline changes/i)).toBeInTheDocument();
  });

  it('closes after confirming discard of unsaved valid edits', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={onOpenChange}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove timeline event 2/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await user.click(screen.getByRole('button', { name: /discard changes/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes immediately when cancel is clicked with no unsaved changes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={onOpenChange}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        initialEvents={submittedAcceptedEvents}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('allows cancel while edit-mode history is still loading', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <HistoricalTimelineEditorDialog
        open
        onOpenChange={onOpenChange}
        workOrderId="wo-1"
        organizationId="org-1"
        equipmentId="equipment-1"
        mode="edit"
        historyRows={[]}
        historyReady={false}
      />,
    );

    expect(screen.getByText(/loading historical timeline/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
