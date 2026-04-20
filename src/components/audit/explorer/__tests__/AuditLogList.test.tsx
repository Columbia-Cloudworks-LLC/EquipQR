import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import {
  ACTION_SEVERITY_COLOR,
  AuditAction,
  FormattedAuditEntry,
} from '@/types/audit';
import { AuditLogList, VIRTUALIZATION_THRESHOLD } from '../AuditLogList';

// react-window's FixedSizeList renders absolutely positioned children inside a
// scrollable container. In a JSDOM env it cannot calculate layout, so it
// commonly omits items. Stub it so the virtual-path test can still observe a
// list render.
vi.mock('react-window', () => ({
  FixedSizeList: ({
    itemCount,
    children,
  }: {
    itemCount: number;
    children: (props: { index: number; style: React.CSSProperties }) => React.ReactNode;
  }) => (
    <div data-testid="virtual-list-stub" data-item-count={itemCount}>
      {Array.from({ length: itemCount }, (_, index) => (
        <React.Fragment key={index}>
          {children({ index, style: { height: 36 } })}
        </React.Fragment>
      ))}
    </div>
  ),
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

describe('AuditLogList', () => {
  it('calls onSelect with the entry when a row is clicked', () => {
    const entries = [makeEntry('a'), makeEntry('b')];
    const onSelect = vi.fn();
    render(
      <AuditLogList
        entries={entries}
        onSelect={onSelect}
        height={400}
      />
    );

    const rows = screen.getAllByTestId('audit-log-list-row');
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[1]);
    expect(onSelect).toHaveBeenCalledWith(entries[1]);
  });

  it('renders the severity stripe in the action color', () => {
    const entries = [
      makeEntry('a', { action: 'DELETE' }),
      makeEntry('b', { action: 'INSERT' }),
    ];
    render(<AuditLogList entries={entries} onSelect={() => {}} height={400} />);

    const stripes = screen.getAllByTestId('audit-log-severity-stripe');
    expect(stripes[0]).toHaveStyle({ backgroundColor: ACTION_SEVERITY_COLOR.DELETE });
    expect(stripes[1]).toHaveStyle({ backgroundColor: ACTION_SEVERITY_COLOR.INSERT });
  });

  it('renders the static (non-virtualized) variant below the threshold', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD - 1 }, (_, i) =>
      makeEntry(String(i))
    );
    render(<AuditLogList entries={entries} onSelect={() => {}} height={400} />);

    expect(screen.getByTestId('audit-log-list-static')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-log-list-virtual')).not.toBeInTheDocument();
  });

  it('switches to the virtualized variant at or above the threshold', () => {
    const entries = Array.from({ length: VIRTUALIZATION_THRESHOLD }, (_, i) =>
      makeEntry(String(i))
    );
    render(<AuditLogList entries={entries} onSelect={() => {}} height={400} />);

    expect(screen.getByTestId('audit-log-list-virtual')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-log-list-static')).not.toBeInTheDocument();
  });

  it('moves selection on ArrowDown / ArrowUp / Enter', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    const onSelect = vi.fn();
    render(
      <AuditLogList
        entries={entries}
        selectedId="a"
        onSelect={onSelect}
        height={400}
      />
    );

    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith(entries[1]);

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith(entries[2]);

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(onSelect).toHaveBeenLastCalledWith(entries[1]);

    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith(entries[1]);
  });

  it('renders the empty state when there are no entries', () => {
    render(
      <AuditLogList
        entries={[]}
        onSelect={() => {}}
        height={400}
        emptyState={<div data-testid="custom-empty">Nothing here</div>}
      />
    );

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
  });
});
