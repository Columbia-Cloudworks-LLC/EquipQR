import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { BulkEquipmentGrid } from '../BulkEquipmentGrid';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

/**
 * Build the minimal subset of `EquipmentRecord` the grid actually reads.
 * Fields the columns don't render are filled in as nulls/empty strings; the
 * test does not exercise those code paths.
 */
function buildRow(id: string, overrides: Partial<EquipmentRecord> = {}): EquipmentRecord {
  // Cast through `unknown` so the test fixture only specifies the fields the
  // grid actually reads. The full Supabase row shape has many fields the bulk
  // grid does not surface (location coords, customer_id, etc.) and stubbing
  // each one adds noise without exercising any code path.
  return {
    id,
    organization_id: 'org-1',
    name: `Equipment ${id}`,
    manufacturer: 'Caterpillar',
    model: 'D6',
    serial_number: 'SN-1',
    status: 'active',
    location: 'Yard A',
    working_hours: 100,
    team_id: null,
    team_name: undefined,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    installation_date: '2026-01-01',
    use_team_location: false,
    notes: null,
    image_url: null,
    warranty_expiration: null,
    last_maintenance: null,
    custom_attributes: null,
    last_known_location: null,
    ...overrides,
  } as unknown as EquipmentRecord;
}

function renderGrid(props: Partial<React.ComponentProps<typeof BulkEquipmentGrid>> = {}) {
  const rows = props.rows ?? [buildRow('eq-1'), buildRow('eq-2')];
  const onSetCellValue = props.onSetCellValue ?? vi.fn();
  const onSetCellValueOnRows = props.onSetCellValueOnRows ?? vi.fn();
  const onToggleSelected = props.onToggleSelected ?? vi.fn();
  const onSelectAll = props.onSelectAll ?? vi.fn();
  const onClearSelection = props.onClearSelection ?? vi.fn();
  const dirtyRows = props.dirtyRows ?? new Map();
  const selectedRowIds = props.selectedRowIds ?? new Set<string>();

  const utils = render(
    <MemoryRouter>
      <BulkEquipmentGrid
        rows={rows}
        dirtyRows={dirtyRows}
        selectedRowIds={selectedRowIds}
        onSetCellValue={onSetCellValue}
        onSetCellValueOnRows={onSetCellValueOnRows}
        onToggleSelected={onToggleSelected}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    </MemoryRouter>
  );

  return { ...utils, onToggleSelected, rows };
}

/**
 * Single-click on a row toggles row selection AFTER the dblclick debounce
 * window — the click handler now lives on `<TableRow>` so dead-zone clicks
 * (Team text, padding, empty cells) also select the row, addressing the
 * Copilot feedback that selection was previously cell-only.
 */
describe('BulkEquipmentGrid — row-level selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getRowFor(id: string): HTMLElement {
    // Row accessible name varies by row content; rather than rely on it, look
    // up the row by walking up from the row's checkbox aria-label.
    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(`Select Equipment ${id}`, 'i'),
    });
    const row = checkbox.closest('tr');
    if (!row) throw new Error(`Could not find row for ${id}`);
    return row;
  }

  it('row click toggles selection after the 250ms dblclick debounce window', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    fireEvent.click(firstRow);
    expect(onToggleSelected).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onToggleSelected).toHaveBeenCalledWith('eq-1');
  });

  it('double-click on a cell cancels the row-level pending toggle (no spurious selection on edit)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    const manufacturerCell = within(firstRow).getByRole('button', {
      name: /manufacturer: Caterpillar/i,
    });

    fireEvent.click(firstRow);
    fireEvent.doubleClick(manufacturerCell);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it('checkbox click does NOT bubble through to the row toggle (avoids double-toggle)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const firstRow = getRowFor('eq-1');
    const checkbox = within(firstRow).getByRole('checkbox', {
      name: /Select Equipment eq-1/i,
    });
    fireEvent.click(checkbox);

    act(() => {
      vi.advanceTimersByTime(250);
    });
    // The checkbox's own onCheckedChange calls onToggleSelected once; the
    // bubbled row click is suppressed via stopPropagation on the checkbox.
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).toHaveBeenCalledWith('eq-1');
  });
});
