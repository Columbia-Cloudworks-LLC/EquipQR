/**
 * Multi-select model for the audit explorer list (#1166). Pure helpers so the
 * click/keyboard semantics are unit-testable without rendering.
 *
 * Semantics (matching common file-manager conventions):
 * - Plain click: select only that row; clicking the sole selected row again
 *   deselects it (returning the table to its full-width state).
 * - Ctrl/Cmd click or checkbox: toggle the row without clearing the rest.
 * - Shift click: select the contiguous range between the anchor row and the
 *   clicked row, replacing the previous selection.
 */

import { FormattedAuditEntry } from '@/types/audit';

export interface AuditSelectionState {
  ids: ReadonlySet<string>;
  /** Row that anchors shift-range selection. */
  anchorId: string | null;
}

export const EMPTY_AUDIT_SELECTION: AuditSelectionState = {
  ids: new Set<string>(),
  anchorId: null,
};

export interface RowClickModifiers {
  ctrlOrMeta: boolean;
  shift: boolean;
}

export function toggleSelection(
  state: AuditSelectionState,
  entryId: string,
): AuditSelectionState {
  const next = new Set(state.ids);
  if (next.has(entryId)) {
    next.delete(entryId);
  } else {
    next.add(entryId);
  }
  return { ids: next, anchorId: entryId };
}

function rangeSelection(
  state: AuditSelectionState,
  entries: FormattedAuditEntry[],
  entryId: string,
): AuditSelectionState {
  const anchorIndex = entries.findIndex((e) => e.id === state.anchorId);
  const targetIndex = entries.findIndex((e) => e.id === entryId);
  if (anchorIndex < 0 || targetIndex < 0) {
    return { ids: new Set([entryId]), anchorId: entryId };
  }
  const [from, to] =
    anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const ids = new Set(entries.slice(from, to + 1).map((e) => e.id));
  return { ids, anchorId: state.anchorId };
}

export function applyRowClick(
  state: AuditSelectionState,
  entries: FormattedAuditEntry[],
  entry: FormattedAuditEntry,
  modifiers: RowClickModifiers,
): AuditSelectionState {
  if (modifiers.shift && state.anchorId) {
    return rangeSelection(state, entries, entry.id);
  }
  if (modifiers.ctrlOrMeta) {
    return toggleSelection(state, entry.id);
  }
  // Plain click: toggle off when it is the sole selection, otherwise
  // replace the selection with this row.
  if (state.ids.size === 1 && state.ids.has(entry.id)) {
    return { ids: new Set<string>(), anchorId: null };
  }
  return { ids: new Set([entry.id]), anchorId: entry.id };
}

/** Drop ids that no longer exist in the current entry list (page/filter change). */
export function pruneSelection(
  state: AuditSelectionState,
  entries: FormattedAuditEntry[],
): AuditSelectionState {
  const valid = new Set(entries.map((e) => e.id));
  const ids = new Set([...state.ids].filter((id) => valid.has(id)));
  const anchorId =
    state.anchorId && valid.has(state.anchorId) ? state.anchorId : null;
  if (ids.size === state.ids.size && anchorId === state.anchorId) return state;
  return { ids, anchorId };
}
