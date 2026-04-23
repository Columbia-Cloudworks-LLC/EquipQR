/**
 * AuditLogList — dense, severity-tagged scrollable list for the audit
 * explorer (issue #641). Virtualizes via react-window above 100 entries
 * and falls back to a non-virtualized list for keyboard / screen-reader
 * friendliness on small datasets.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeList as VirtualList } from 'react-window';
import { format as formatDate } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChangesSummary } from '@/components/audit/ChangesDiff';
import {
  ACTION_SEVERITY_COLOR,
  AuditAction,
  FormattedAuditEntry,
} from '@/types/audit';

const ROW_HEIGHT = 36;

/**
 * Switching threshold between the non-virtualized and react-window paths.
 * Exported so the component test can assert the boundary.
 */
export const VIRTUALIZATION_THRESHOLD = 100;

export interface AuditLogListProps {
  entries: FormattedAuditEntry[];
  selectedId?: string | null;
  onSelect: (entry: FormattedAuditEntry) => void;
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

interface RowProps {
  entry: FormattedAuditEntry;
  selected: boolean;
  onClick: () => void;
}

function AuditListRow({ entry, selected, onClick }: RowProps) {
  return (
    <div
      role="option"
      aria-selected={selected}
      data-testid="audit-log-list-row"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 h-9 px-3 cursor-pointer text-xs',
        'border-b border-border/40 last:border-b-0 transition-colors',
        selected ? 'bg-accent/60' : 'hover:bg-muted/40'
      )}
    >
      <span
        data-testid="audit-log-severity-stripe"
        className="block w-1 h-5 rounded-sm shrink-0"
        style={{ backgroundColor: ACTION_SEVERITY_COLOR[entry.action] }}
        aria-hidden="true"
      />
      <span className="font-mono tabular-nums text-[11px] text-muted-foreground w-[110px] shrink-0">
        {formatDate(new Date(entry.created_at), 'MMM d HH:mm:ss')}
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
  selectedId,
  onSelect,
  height,
  isLoading = false,
  emptyState,
}: AuditLogListProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      entries.findIndex((e) => e.id === selectedId)
    )
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<React.ComponentRef<typeof VirtualList>>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollVirtualToIndex = useCallback(
    (index: number) => {
      if (entries.length >= VIRTUALIZATION_THRESHOLD) {
        listRef.current?.scrollToItem(index, 'smart');
      }
    },
    [entries.length]
  );

  useEffect(() => {
    const idx = entries.findIndex((e) => e.id === selectedId);
    if (idx >= 0) {
      setActiveIndex(idx);
      scrollVirtualToIndex(idx);
    }
  }, [selectedId, entries, scrollVirtualToIndex]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setContainerWidth(e.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (entries.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(entries.length - 1, activeIndex + 1);
      setActiveIndex(next);
      onSelect(entries[next]);
      scrollVirtualToIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActiveIndex(prev);
      onSelect(entries[prev]);
      scrollVirtualToIndex(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (entries[activeIndex]) onSelect(entries[activeIndex]);
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
            selected={entry.id === selectedId}
            onClick={() => onSelect(entry)}
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
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="audit-log-list-virtual"
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      <VirtualList
        ref={listRef}
        height={height}
        width={containerWidth || 800}
        itemCount={entries.length}
        itemSize={ROW_HEIGHT}
      >
        {({ index, style }) => (
          <div style={style}>
            <AuditListRow
              entry={entries[index]}
              selected={entries[index].id === selectedId}
              onClick={() => onSelect(entries[index])}
            />
          </div>
        )}
      </VirtualList>
    </div>
  );
}

export default AuditLogList;
