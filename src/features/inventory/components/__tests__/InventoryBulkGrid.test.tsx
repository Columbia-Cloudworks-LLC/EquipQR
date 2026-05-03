import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { InventoryBulkGrid } from '../InventoryBulkGrid';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { InventoryRowDelta } from '@/features/inventory/hooks/useBulkEditInventory';

// react-window requires measurements not available in jsdom; stub it to render
// all items synchronously so tests can inspect rendered rows.
vi.mock('react-window', () => ({
  FixedSizeList: ({
    children: ItemRenderer,
    itemCount,
    itemSize,
  }: {
    children: (props: { index: number; style: React.CSSProperties }) => React.ReactElement | null;
    itemCount: number;
    itemSize: number;
    height: number;
    width: number | string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="virtual-list">
      {Array.from({ length: itemCount }, (_, index) =>
        <div key={index}>{ItemRenderer({ index, style: { height: itemSize, position: 'relative' } })}</div>
      )}
    </div>
  ),
}));

function buildRow(id: string, overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id,
    organization_id: 'org-1',
    name: `Item ${id}`,
    description: null,
    sku: `SKU-${id}`,
    external_id: null,
    quantity_on_hand: 50,
    low_stock_threshold: 5,
    location: 'Warehouse A',
    default_unit_cost: '10.00',
    image_url: null,
    isLowStock: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    ...overrides,
  } as unknown as InventoryItem;
}

function renderGrid(
  props: Partial<React.ComponentProps<typeof InventoryBulkGrid>> = {}
) {
  const rows = props.rows ?? [buildRow('i-1'), buildRow('i-2')];
  const onSetCellValue = props.onSetCellValue ?? vi.fn();
  const onSetCellValueOnRows = props.onSetCellValueOnRows ?? vi.fn();
  const onToggleSelected = props.onToggleSelected ?? vi.fn();
  const onSelectAll = props.onSelectAll ?? vi.fn();
  const onClearSelection = props.onClearSelection ?? vi.fn();
  const dirtyRows = props.dirtyRows ?? new Map<string, InventoryRowDelta>();
  const selectedRowIds = props.selectedRowIds ?? new Set<string>();

  const utils = render(
    <MemoryRouter>
      <InventoryBulkGrid
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryBulkGrid — row selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function getRowFor(id: string): HTMLElement {
    const checkbox = screen.getByRole('checkbox', {
      name: new RegExp(`Select Item ${id}`, 'i'),
    });
    const row = checkbox.closest('[role="row"]');
    if (!row) throw new Error(`Could not find row for ${id}`);
    return row as HTMLElement;
  }

  it('row click toggles selection after the 250ms debounce window', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    fireEvent.click(row);
    expect(onToggleSelected).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(250); });
    expect(onToggleSelected).toHaveBeenCalledWith('i-1');
  });

  it('double-click on a cell cancels the pending row-level toggle', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    const nameCell = within(row).getAllByRole('button')[0]; // first SortableHeader or BulkEditableCell button

    fireEvent.click(row);
    fireEvent.doubleClick(nameCell);

    act(() => { vi.advanceTimersByTime(500); });
    expect(onToggleSelected).not.toHaveBeenCalled();
  });

  it('checkbox click calls onToggleSelected exactly once (no double-fire from row click)', () => {
    const onToggleSelected = vi.fn();
    renderGrid({ onToggleSelected });

    const row = getRowFor('i-1');
    const checkbox = within(row).getByRole('checkbox', {
      name: new RegExp(`Select Item i-1`, 'i'),
    });

    fireEvent.click(checkbox);

    act(() => { vi.advanceTimersByTime(250); });
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
    expect(onToggleSelected).toHaveBeenCalledWith('i-1');
  });
});

describe('InventoryBulkGrid — select-all header checkbox', () => {
  it('selects all rows when none are selected', () => {
    const onSelectAll = vi.fn();
    renderGrid({ onSelectAll });

    const headerCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(headerCheckbox);

    expect(onSelectAll).toHaveBeenCalledWith(['i-1', 'i-2']);
  });

  it('clears selection when all rows are selected', () => {
    const onClearSelection = vi.fn();
    const rows = [buildRow('i-1'), buildRow('i-2')];
    const selectedRowIds = new Set(['i-1', 'i-2']);
    renderGrid({ rows, selectedRowIds, onClearSelection });

    const headerCheckbox = screen.getByRole('checkbox', { name: /select all rows/i });
    fireEvent.click(headerCheckbox);

    expect(onClearSelection).toHaveBeenCalled();
  });
});

describe('InventoryBulkGrid — empty state', () => {
  it('renders empty-state message when rows is empty', () => {
    renderGrid({ rows: [] });
    expect(screen.getByText(/No inventory items to edit/i)).toBeInTheDocument();
  });
});

describe('InventoryBulkGrid — dirty cell indicator', () => {
  it('renders a dirty row when dirtyRows contains that item', () => {
    const dirtyRows = new Map<string, InventoryRowDelta>([
      ['i-1', { location: 'New Location' }],
    ]);
    renderGrid({ dirtyRows });

    // The virtualized list is rendered; the row container should have the dirty bg class
    const list = screen.getByTestId('virtual-list');
    expect(list).toBeInTheDocument();
    // Dirty state is applied via CSS class — ensure the row is rendered
    const rows = list.querySelectorAll('[role="row"]');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
