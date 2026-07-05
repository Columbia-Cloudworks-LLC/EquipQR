import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderNoteTimelineEntry } from '@/features/work-orders/components/WorkOrderNoteTimelineEntry';

vi.mock('@/features/work-orders/hooks/useWorkOrderNoteTimestamp', () => ({
  useUpdateHistoricalWorkOrderNoteTimestamp: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const baseNote = {
  id: 'note-1',
  author_name: 'Alex Tech',
  created_at: '2024-01-02T10:00:00.000Z',
  content: 'Backdated paperwork note',
  hours_worked: 0,
  is_private: false,
};

describe('WorkOrderNoteTimelineEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows timestamp edit controls when enabled', () => {
    render(
      <WorkOrderNoteTimelineEntry
        note={baseNote}
        workOrderId="wo-1"
        formatDate={(iso) => iso}
        canEditTimestamp
      />,
    );

    expect(screen.getByRole('button', { name: /edit timestamp for note by alex tech/i })).toBeInTheDocument();
  });

  it('hides timestamp edit controls when disabled', () => {
    render(
      <WorkOrderNoteTimelineEntry
        note={baseNote}
        workOrderId="wo-1"
        formatDate={(iso) => iso}
        canEditTimestamp={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit timestamp/i })).not.toBeInTheDocument();
  });
});
