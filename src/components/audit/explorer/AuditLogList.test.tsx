import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ACTION_SEVERITY_COLOR,
  AuditAction,
  FormattedAuditEntry,
} from '@/types/audit';
import { AuditLogList, VIRTUALIZATION_THRESHOLD } from './AuditLogList';

vi.mock('@/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    settings: {
      timezone: 'Australia/Sydney',
      dateFormat: 'MM/dd/yyyy' as const,
    },
    updateSetting: vi.fn(),
    resetSettings: vi.fn(),
    isLoading: false,
  }),
}));

const { mockScrollToRow } = vi.hoisted(() => ({
  mockScrollToRow: vi.fn(),
}));

// react-window's List renders absolutely positioned children inside a
// scrollable container. In a JSDOM env it cannot calculate layout, so it
// commonly omits items. Stub it so the virtual-path test can still observe a
// list render.
vi.mock('react-window', () => ({
  List({
    rowComponent: Row,
    rowCount,
    rowHeight,
    rowProps,
    listRef,
    style,
  }: {
    rowComponent: React.ComponentType<
      Record<string, unknown> & {
        index: number;
        style: React.CSSProperties;
        ariaAttributes: {
          role: 'listitem';
          'aria-posinset': number;
          'aria-setsize': number;
        };
      }
    >;
    rowCount: number;
    rowHeight: number;
    rowProps: Record<string, unknown>;
    listRef?: React.MutableRefObject<{
      scrollToRow: (config: { index: number; align?: string }) => void;
    } | null>;
    style?: React.CSSProperties;
  }) {
    React.useLayoutEffect(() => {
      if (listRef) {
        listRef.current = {
          scrollToRow: mockScrollToRow,
          get element() {
            return null;
          },
        };
      }
    }, [listRef]);
    const rh = typeof rowHeight === 'number' ? rowHeight : 36;
    return (
      <div data-testid="virtual-list-stub" data-row-count={rowCount} style={style}>
        {Array.from({ length: rowCount }, (_, index) => (
          <React.Fragment key={index}>
            <Row
              index={index}
              style={{ height: rh }}
              ariaAttributes={{
                role: 'listitem',
                'aria-posinset': index + 1,
                'aria-setsize': rowCount,
              }}
              {...rowProps}
            />
          </React.Fragment>
        ))}
      </div>
    );
  },
  useListRef: () => React.useRef(null),
}));

function makeEntry(
  id: string,
  overrides: Partial<FormattedAuditEntry> = {}
): FormattedAuditEntry {
  const action: AuditAction = (overrides.action as AuditAction) ?? 'UPDATE';
  return {
    id,
    organization_id: 'org-1',
    entity_type: 'equipment',
    entity_id: 'ent-' + id,
    entity_name: 'Forklift ' + id,
    action,
    actor_id: 'actor-1',
    actor_name: 'Test User',
    actor_email: 'test@example.com',
    changes: {},
    metadata: {},
    created_at: '2026-04-20T10:00:00.000Z',
    actionLabel: action === 'INSERT' ? 'Created' : action === 'UPDATE' ? 'Updated' : 'Deleted',
    entityTypeLabel: 'Equipment',
    formattedDate: 'Apr 20, 2026 10:00 AM',
    relativeTime: 'just now',
    changeCount: 0,
    ...overrides,
  };
}

const noSelection = new Set<string>();

function renderList(
  props: Partial<React.ComponentProps<typeof AuditLogList>> & {
    entries: FormattedAuditEntry[];
  }
) {
  const onRowClick = vi.fn();
  const onCheckboxToggle = vi.fn();
  const onEscape = vi.fn();
  const utils = render(
    <AuditLogList
      selectedIds={noSelection}
      onRowClick={onRowClick}
      onCheckboxToggle={onCheckboxToggle}
      onEscape={onEscape}
      height={400}
      {...props}
    />
  );
  return { ...utils, onRowClick, onCheckboxToggle, onEscape };
}

describe('AuditLogList', () => {
  let getBoundingClientRectSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    mockScrollToRow.mockClear();
    getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        width: 1024,
        height: 400,
        top: 0,
        left: 0,
        right: 1024,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);
  });

  afterEach(() => {
    getBoundingClientRectSpy?.mockRestore();
  });

  it('formats created_at in the user timezone (Australia/Sydney fixture)', () => {
    const entries = [makeEntry('a', { created_at: '2026-04-20T10:00:00.000Z' })];
    renderList({ entries });

    const row = screen.getByTestId('audit-log-list-row');
    // 10:00 UTC → 20:00 on 04/20/2026 in Sydney (AEST, UTC+10).
    expect(row).toHaveTextContent(/04\/20\/2026/);
    expect(row).toHaveTextContent(/8:00\s+PM/i);
  });

  it('reports row clicks with modifier state', () => {
    const entries = [makeEntry('a'), makeEntry('b')];
    const { onRowClick } = renderList({ entries });

    const rows = screen.getAllByTestId('audit-log-list-row');
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[1]);
    expect(onRowClick).toHaveBeenLastCalledWith(entries[1], {
      ctrlOrMeta: false,
      shift: false,
    });

    fireEvent.click(rows[0], { ctrlKey: true });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[0], {
      ctrlOrMeta: true,
      shift: false,
    });

    fireEvent.click(rows[1], { shiftKey: true });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[1], {
      ctrlOrMeta: false,
      shift: true,
    });
  });

  it('toggles membership via the row checkbox without triggering a row click', () => {
    const entries = [makeEntry('a'), makeEntry('b')];
    const { onRowClick, onCheckboxToggle } = renderList({ entries });

    const checkboxes = screen.getAllByTestId('audit-log-row-checkbox');
    fireEvent.click(checkboxes[1]);

    expect(onCheckboxToggle).toHaveBeenCalledWith(entries[1]);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('marks the listbox as multiselectable and reflects selection state', () => {
    const entries = [makeEntry('a'), makeEntry('b')];
    renderList({ entries, selectedIds: new Set(['b']) });

    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the severity stripe in the action color', () => {
    const entries = [
      makeEntry('a', { action: 'DELETE' }),
      makeEntry('b', { action: 'INSERT' }),
    ];
    renderList({ entries });

    const stripes = screen.getAllByTestId('audit-log-severity-stripe');
    expect(stripes[0]).toHaveStyle({ backgroundColor: ACTION_SEVERITY_COLOR.DELETE });
    expect(stripes[1]).toHaveStyle({ backgroundColor: ACTION_SEVERITY_COLOR.INSERT });
  });

  it('renders the static (non-virtualized) variant below the threshold', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD - 1 }, (_, i) =>
      makeEntry(String(i))
    );
    renderList({ entries });

    expect(screen.getByTestId('audit-log-list-static')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-log-list-virtual')).not.toBeInTheDocument();
  });

  it('switches to the virtualized variant at or above the threshold', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD }, (_, i) =>
      makeEntry(String(i))
    );
    renderList({ entries });

    expect(screen.getByTestId('audit-log-list-virtual')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-log-list-static')).not.toBeInTheDocument();
    const virtualList = screen.getByTestId('virtual-list-stub');
    expect(virtualList).toHaveStyle({ width: '100%' });
  });

  it('virtual rows use listbox option semantics (no react-window listitem role bleed)', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD }, (_, i) =>
      makeEntry(String(i))
    );
    renderList({ entries });

    const listbox = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(listbox.querySelectorAll('[role="listitem"]')).toHaveLength(0);
  });

  it('moves selection on ArrowDown / ArrowUp / Enter', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    const { onRowClick } = renderList({ entries, selectedIds: new Set(['a']) });

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[1], expect.anything());

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[2], expect.anything());

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[1], expect.anything());

    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onRowClick).toHaveBeenLastCalledWith(entries[1], expect.anything());
  });

  it('invokes onEscape when Escape is pressed on the listbox', () => {
    const entries = [makeEntry('a')];
    const { onEscape } = renderList({ entries });

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('scrolls the virtual list on keyboard navigation when virtualized', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD }, (_, i) =>
      makeEntry(String(i))
    );
    renderList({ entries, selectedIds: new Set(['0']) });

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(mockScrollToRow).toHaveBeenCalledWith({ index: 1, align: 'smart' });
  });

  it('renders the empty state when there are no entries', () => {
    renderList({
      entries: [],
      emptyState: <div data-testid="custom-empty">Nothing here</div>,
    });

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
  });
});
