/**
 * AuditLogList — dense, severity-tagged scrollable list for the audit
 * explorer (issue #641). Virtualizes via react-window above 100 entries
 * and falls back to a non-virtualized list for keyboard / screen-reader
 * friendliness on small datasets.
 *
 * Supports multi-select (#1166): row checkboxes, Ctrl/Cmd-click toggling,
 * and Shift-click range selection. Selection semantics live in
 * `auditSelection.ts`; this component only reports interactions upward.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { List, useListRef, type RowComponentProps } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { ChangesSummary } from '@/components/audit/ChangesDiff';
import {
  ACTION_SEVERITY_COLOR,
  AuditAction,
  FormattedAuditEntry,
} from '@/types/audit';
import type { RowClickModifiers } from './auditSelection';

const ROW_HEIGHT = 36;

/**
 * Switching threshold between the non-virtualized and react-window paths.
 * Exported so the component test can assert the boundary.
 */
export const VIRTUALIZATION_THRESHOLD = 100;

export interface AuditLogListProps {
  entries: FormattedAuditEntry[];
  selectedIds: ReadonlySet<string>;
  onRowClick: (entry: FormattedAuditEntry, modifiers: RowClickModifiers) => void;
  onCheckboxToggle: (entry: FormattedAuditEntry) => void;
  onEscape?: () => void;
  height: number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

function getActionBadgeVariant(action: AuditAction) {
  switch (action) {
    case 'INSERT':
      return 'default' as const;
    case 'UPDATE':
      return 'secondary' as const;
    case 'DELETE':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function modifiersFromEvent(e: React.MouseEvent | React.KeyboardEvent): RowClickModifiers {
  return { ctrlOrMeta: e.ctrlKey || e.metaKey, shift: e.shiftKey };
}

interface RowProps {
  entry: FormattedAuditEntry;
  selected: boolean;
  onRowClick: (entry: FormattedAuditEntry, modifiers: RowClickModifiers) => void;
  onCheckboxToggle: (entry: FormattedAuditEntry) => void;
  createdAtLabel: string;
  /** When false, omit listbox option role (parent virtual row owns `role="option"`). */
  rootRole?: 'option' | false;
}

type AuditVirtualRowProps = {
  entries: FormattedAuditEntry[];
  selectedIds: ReadonlySet<string>;
  formatDateTime: (iso: string) => string;
  onRowClick: (entry: FormattedAuditEntry, modifiers: RowClickModifiers) => void;
  onCheckboxToggle: (entry: FormattedAuditEntry) => void;
};

function AuditVirtualRow({
  index,
  style,
  entries,
  selectedIds,
  formatDateTime,
  onRowClick,
  onCheckboxToggle,
}: RowComponentProps<AuditVirtualRowProps>) {
  const entry = entries[index];
  if (!entry) return null;
  return (
    <div
      style={style}
      role="option"
      aria-selected={selectedIds.has(entry.id)}
    >
      <AuditListRow
        entry={entry}
        selected={selectedIds.has(entry.id)}
        onRowClick={onRowClick}
        onCheckboxToggle={onCheckboxToggle}
        createdAtLabel={formatDateTime(entry.created_at)}
        rootRole={false}
      />
    </div>
  );
}

function AuditListRow({
  entry,
  selected,
  onRowClick,
  onCheckboxToggle,
  createdAtLabel,
  rootRole = 'option',
}: RowProps) {
  const handleClick = (e: React.MouseEvent) => {
    onRowClick(entry, modifiersFromEvent(e));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onRowClick(entry, modifiersFromEvent(e));
    }
  };

  return (
    <div
      role={rootRole === false ? undefined : rootRole}
      aria-selected={rootRole === false ? undefined : selected}
      data-testid="audit-log-list-row"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={rootRole === 'option' ? 0 : undefined}
      className={cn(
        'group flex items-center gap-3 h-9 px-3 cursor-pointer text-xs select-none',
        'border-b border-border/40 last:border-b-0 transition-colors',
        selected ? 'bg-accent/60' : 'hover:bg-muted/40'
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onCheckboxToggle(entry)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={`Select audit entry for ${entry.entity_name ?? 'unknown entity'}`}
        className="h-3.5 w-3.5 shrink-0"
        data-testid="audit-log-row-checkbox"
      />
      <span
        data-testid="audit-log-severity-stripe"
        className="block w-1 h-5 rounded-sm shrink-0"
        style={{ backgroundColor: ACTION_SEVERITY_COLOR[entry.action] }}
        aria-hidden="true"
      />
      <span className="font-mono tabular-nums text-[11px] text-muted-foreground min-w-[110px] shrink-0">
        {createdAtLabel}
      </span>
      <Badge
        variant="outline"
        className="text-[10px] py-0 px-1.5 h-4 font-normal shrink-0"
      >
        {entry.entityTypeLabel}
      </Badge>
      <Badge
        variant={getActionBadgeVariant(entry.action)}
        className="text-[10px] py-0 px-1.5 h-4 font-normal shrink-0"
      >
        {entry.actionLabel}
      </Badge>
      <span className="font-medium truncate min-w-0 basis-[180px]">
        {entry.entity_name ?? 'Unknown'}
      </span>
      <span className="text-muted-foreground truncate min-w-0 basis-[120px]">
        {entry.actor_name}
      </span>
      <span className="text-muted-foreground/80 truncate min-w-0 flex-1">
        {Object.keys(entry.changes).length > 0 ? (
          <ChangesSummary changes={entry.changes} />
        ) : (
          <span className="italic">No changes</span>
        )}
      </span>
    </div>
  );
}

export function AuditLogList({
  entries,
  selectedIds,
  onRowClick,
  onCheckboxToggle,
  onEscape,
  height,
  isLoading = false,
  emptyState,
}: AuditLogListProps) {
  const { formatDateTime } = useFormatTimestamp();

  const firstSelectedId = useMemo(() => {
    const first = entries.find((e) => selectedIds.has(e.id));
    return first?.id ?? null;
  }, [entries, selectedIds]);

  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      entries.findIndex((e) => e.id === firstSelectedId)
    )
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef();
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollVirtualToIndex = useCallback(
    (index: number) => {
      if (entries.length >= VIRTUALIZATION_THRESHOLD) {
        listRef.current?.scrollToRow({ index, align: 'smart' });
      }
    },
    [entries.length, listRef]
  );

  const auditRowProps: AuditVirtualRowProps = useMemo(
    () => ({
      entries,
      selectedIds,
      formatDateTime,
      onRowClick,
      onCheckboxToggle,
    }),
    [entries, selectedIds, formatDateTime, onRowClick, onCheckboxToggle]
  );

  useEffect(() => {
    const idx = entries.findIndex((e) => e.id === firstSelectedId);
    if (idx >= 0) {
      setActiveIndex(idx);
      scrollVirtualToIndex(idx);
    }
  }, [firstSelectedId, entries, scrollVirtualToIndex]);

  const measureContainerWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  // Measure before first paint so react-window never renders at a stale fallback width.
  useLayoutEffect(() => {
    measureContainerWidth();
  }, [measureContainerWidth]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      if (width > 0) {
        setContainerWidth(width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEscape?.();
      return;
    }
    if (entries.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(entries.length - 1, activeIndex + 1);
      setActiveIndex(next);
      onRowClick(entries[next], { ctrlOrMeta: false, shift: e.shiftKey });
      scrollVirtualToIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActiveIndex(prev);
      onRowClick(entries[prev], { ctrlOrMeta: false, shift: e.shiftKey });
      scrollVirtualToIndex(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (entries[activeIndex]) {
        onRowClick(entries[activeIndex], modifiersFromEvent(e));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col" style={{ height }}>
        {Array.from(
          { length: Math.max(6, Math.floor(height / ROW_HEIGHT)) },
          (_, i) => (
            <div
              key={i}
              className="h-9 border-b border-border/40 animate-pulse bg-muted/30"
            />
          )
        )}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        {emptyState}
      </div>
    );
  }

  if (entries.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Audit log entries"
        aria-multiselectable="true"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-testid="audit-log-list-static"
        className="overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        style={{ height }}
      >
        {entries.map((entry) => (
          <AuditListRow
            key={entry.id}
            entry={entry}
            selected={selectedIds.has(entry.id)}
            onRowClick={onRowClick}
            onCheckboxToggle={onCheckboxToggle}
            createdAtLabel={formatDateTime(entry.created_at)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Audit log entries"
      aria-multiselectable="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="audit-log-list-virtual"
      className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      {containerWidth > 0 ? (
        <List
          listRef={listRef}
          rowComponent={AuditVirtualRow}
          rowCount={entries.length}
          rowHeight={ROW_HEIGHT}
          rowProps={auditRowProps}
          style={{ height, width: containerWidth }}
        />
      ) : (
        <div style={{ height }} className="w-full" aria-hidden="true" />
      )}
    </div>
  );
}
