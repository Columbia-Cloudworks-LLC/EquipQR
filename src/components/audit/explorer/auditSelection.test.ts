import { describe, it, expect } from 'vitest';
import { FormattedAuditEntry } from '@/types/audit';
import {
  applyRowClick,
  pruneSelection,
  toggleSelection,
  EMPTY_AUDIT_SELECTION,
  type AuditSelectionState,
} from './auditSelection';

function makeEntry(id: string): FormattedAuditEntry {
  return {
    id,
    organization_id: 'org-1',
    entity_type: 'equipment',
    entity_id: 'ent-' + id,
    entity_name: 'Forklift ' + id,
    action: 'UPDATE',
    actor_id: 'actor-1',
    actor_name: 'Test User',
    actor_email: null,
    changes: {},
    metadata: {},
    created_at: '2026-04-20T10:00:00.000Z',
    actionLabel: 'Updated',
    entityTypeLabel: 'Equipment',
    formattedDate: 'Apr 20, 2026',
    relativeTime: 'just now',
    changeCount: 0,
  };
}

const entries = ['a', 'b', 'c', 'd', 'e'].map(makeEntry);
const byId = Object.fromEntries(entries.map((e) => [e.id, e]));

function selectionOf(ids: string[], anchorId: string | null = null): AuditSelectionState {
  return { ids: new Set(ids), anchorId };
}

describe('applyRowClick', () => {
  it('plain click selects only the clicked row', () => {
    const next = applyRowClick(selectionOf(['a', 'b'], 'a'), entries, byId.c, {
      ctrlOrMeta: false,
      shift: false,
    });
    expect([...next.ids]).toEqual(['c']);
    expect(next.anchorId).toBe('c');
  });

  it('plain click on the sole selected row deselects it (table returns to full width)', () => {
    const next = applyRowClick(selectionOf(['b'], 'b'), entries, byId.b, {
      ctrlOrMeta: false,
      shift: false,
    });
    expect(next.ids.size).toBe(0);
    expect(next.anchorId).toBeNull();
  });

  it('ctrl/cmd click toggles membership without clearing others', () => {
    const added = applyRowClick(selectionOf(['a'], 'a'), entries, byId.c, {
      ctrlOrMeta: true,
      shift: false,
    });
    expect([...added.ids].sort()).toEqual(['a', 'c']);

    const removed = applyRowClick(added, entries, byId.a, {
      ctrlOrMeta: true,
      shift: false,
    });
    expect([...removed.ids]).toEqual(['c']);
  });

  it('shift click selects the contiguous range from the anchor', () => {
    const next = applyRowClick(selectionOf(['b'], 'b'), entries, byId.d, {
      ctrlOrMeta: false,
      shift: true,
    });
    expect([...next.ids].sort()).toEqual(['b', 'c', 'd']);
    expect(next.anchorId).toBe('b');
  });

  it('shift click works upward from the anchor too', () => {
    const next = applyRowClick(selectionOf(['d'], 'd'), entries, byId.a, {
      ctrlOrMeta: false,
      shift: true,
    });
    expect([...next.ids].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shift click without an anchor falls back to a single selection', () => {
    const next = applyRowClick(EMPTY_AUDIT_SELECTION, entries, byId.c, {
      ctrlOrMeta: false,
      shift: true,
    });
    expect([...next.ids]).toEqual(['c']);
  });
});

describe('toggleSelection', () => {
  it('adds and removes ids while updating the anchor', () => {
    const added = toggleSelection(EMPTY_AUDIT_SELECTION, 'a');
    expect([...added.ids]).toEqual(['a']);
    expect(added.anchorId).toBe('a');

    const removed = toggleSelection(added, 'a');
    expect(removed.ids.size).toBe(0);
  });
});

describe('pruneSelection', () => {
  it('drops ids that are no longer present in the entry list', () => {
    const state = selectionOf(['a', 'zz'], 'zz');
    const next = pruneSelection(state, entries);
    expect([...next.ids]).toEqual(['a']);
    expect(next.anchorId).toBeNull();
  });

  it('clears a stale anchor when the selected-id count is unchanged', () => {
    const state = selectionOf(['a', 'b'], 'zz');
    const next = pruneSelection(state, entries);
    expect([...next.ids]).toEqual(['a', 'b']);
    expect(next.anchorId).toBeNull();
  });

  it('returns the same state object when nothing changed', () => {
    const state = selectionOf(['a', 'b'], 'a');
    expect(pruneSelection(state, entries)).toBe(state);
  });
});
