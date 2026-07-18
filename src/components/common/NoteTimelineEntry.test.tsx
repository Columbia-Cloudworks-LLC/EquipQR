import { describe, it, expect } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import NoteTimelineEntry, { type NoteTimelineEntryData } from './NoteTimelineEntry';

const baseNote: NoteTimelineEntryData = {
  id: 'note-1',
  author_name: 'Alex Tech',
  created_at: '2026-07-01T12:00:00Z',
  content: 'Replaced hydraulic filter',
  hours_worked: 2.5,
  machine_hours: 1200,
};

const formatDate = (iso: string) => iso.slice(0, 10);

describe('NoteTimelineEntry labor hours visibility', () => {
  it('hides labor hours by default (secure default)', () => {
    render(<NoteTimelineEntry note={baseNote} formatDate={formatDate} />);

    expect(screen.queryByTitle('Hours worked')).not.toBeInTheDocument();
  });

  it('shows labor hours when explicitly enabled for operational roles', () => {
    render(
      <NoteTimelineEntry note={baseNote} formatDate={formatDate} showLaborHours={true} />,
    );

    expect(screen.getByTitle('Hours worked')).toBeInTheDocument();
  });

  it('hides labor hours when showLaborHours is false (requestor/viewer)', () => {
    render(
      <NoteTimelineEntry note={baseNote} formatDate={formatDate} showLaborHours={false} />,
    );

    expect(screen.queryByTitle('Hours worked')).not.toBeInTheDocument();
    // Machine hours are an equipment meter reading, not labor — still visible
    expect(screen.getByTitle('Machine hours')).toBeInTheDocument();
    expect(screen.getByText('Replaced hydraulic filter')).toBeInTheDocument();
  });
});
