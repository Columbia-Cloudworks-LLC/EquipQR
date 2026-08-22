import { describe, expect, it } from 'vitest';
import { mapWorkOrderNoteRow } from './workOrderNoteMappers';
import type { Tables } from '@/integrations/supabase/types';

function makeNoteRow(
  overrides: Partial<Tables<'work_order_notes'>> = {},
): Tables<'work_order_notes'> {
  return {
    id: 'note-1',
    work_order_id: 'wo-1',
    author_id: 'user-1',
    author_name: 'Jane',
    content: 'Replaced filter',
    hours_worked: 1.5,
    is_private: false,
    last_modified_at: null,
    last_modified_by: null,
    machine_hours: 120,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mapWorkOrderNoteRow', () => {
  it('uses the insert-time author when the row author_id is null', () => {
    const note = mapWorkOrderNoteRow(makeNoteRow({ author_id: null, author_name: null }), {
      authorIdFallback: 'user-1',
      images: [],
    });

    expect(note.author_id).toBe('user-1');
    expect(note.author_name).toBeUndefined();
    expect(note.hours_worked).toBe(1.5);
  });

  it('defaults null hours_worked to 0', () => {
    const note = mapWorkOrderNoteRow(makeNoteRow({ hours_worked: null }));
    expect(note.hours_worked).toBe(0);
  });

  it('keeps a provided list author name', () => {
    const note = mapWorkOrderNoteRow(makeNoteRow({ author_name: null }), {
      author_name: 'Unknown',
    });

    expect(note.author_name).toBe('Unknown');
  });
});
