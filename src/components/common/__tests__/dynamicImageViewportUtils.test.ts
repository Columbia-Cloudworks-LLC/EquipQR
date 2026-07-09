import { describe, expect, it } from 'vitest';
import {
  calculatePanPosition,
  imageSupportsPanning,
} from '@/components/common/dynamicImageViewportUtils';
import {
  filterNotesByVisibility,
  isNoteEdited,
  isWithinAuthorEditWindow,
  resolveNoteActionPermissions,
} from '@/components/common/noteCardPermissions';

describe('dynamicImageViewportUtils', () => {
  it('maps pointer position to object-position percentages', () => {
    expect(calculatePanPosition(50, 25, 100, 100)).toEqual({ x: 50, y: 25 });
    expect(calculatePanPosition(150, 0, 100, 200)).toEqual({ x: 100, y: 0 });
  });

  it('detects when panning is useful for mismatched aspect ratios', () => {
    expect(imageSupportsPanning(1600, 900, 300, 300)).toBe(true);
    expect(imageSupportsPanning(300, 300, 300, 300)).toBe(false);
  });
});

describe('noteCardPermissions', () => {
  const note = {
    id: 'note-1',
    author_id: 'user-1',
    created_at: new Date().toISOString(),
  };

  it('filters notes by visibility', () => {
    const notes = [
      { id: '1', is_private: false, author_id: 'a' },
      { id: '2', is_private: true, author_id: 'user-1' },
      { id: '3', is_private: true, author_id: 'other' },
    ];
    expect(filterNotesByVisibility(notes, 'public', 'user-1')).toHaveLength(1);
    expect(filterNotesByVisibility(notes, 'private', 'user-1')).toHaveLength(1);
    expect(filterNotesByVisibility(notes, 'all', 'user-1')).toHaveLength(3);
  });

  it('marks notes edited after creation', () => {
    expect(
      isNoteEdited('2024-01-01T00:00:00Z', '2024-01-01T00:05:00Z'),
    ).toBe(true);
    expect(
      isNoteEdited('2024-01-01T00:00:00Z', '2024-01-01T00:00:10Z'),
    ).toBe(false);
  });

  it('allows managers to edit any note', () => {
    const perms = resolveNoteActionPermissions({
      note,
      currentUserId: 'other-user',
      isOrgAdmin: false,
      isTeamManager: true,
      isViewerOrRequestor: false,
    });
    expect(perms.canEdit).toBe(true);
    expect(perms.canDelete).toBe(true);
  });

  it('limits author edit window', () => {
    const oldNote = {
      ...note,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    };
    expect(isWithinAuthorEditWindow(oldNote.created_at, 24)).toBe(false);
    const perms = resolveNoteActionPermissions({
      note: oldNote,
      currentUserId: 'user-1',
      isOrgAdmin: false,
      isTeamManager: false,
      isViewerOrRequestor: false,
      editWindowHours: 24,
    });
    expect(perms.canEdit).toBe(false);
    expect(perms.canDelete).toBe(true);
  });
});
