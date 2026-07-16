/**
 * AuditExplorer — top-level shell for the /audit-log experience (issues
 * #641, #1166). Composes the toolbar with time-range picker above a
 * customizable dashboard grid (key metrics, timeline histogram, events).
 * Owns the explorer's filters / preset / selection / pagination state.
 *
 * Selection model (#1166): the events table renders full-width until rows
 * are selected. A single selection opens the detail inspector; a multi
 * selection swaps it for the bulk-actions pane (export as Markdown, Excel,
 * or PDF).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDefaultLayout, type LayoutStorage } from 'react-resizable-panels';
import { History } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import {
  useAuditExport,
  useAuditTimeline,
  useOrganizationAuditLog,
  deriveTimelineBucket,
} from '@/hooks/useAuditLog';
import { usePermissions } from '@/hooks/usePermissions';
import AuditLogToolbar from '@/components/audit/AuditLogToolbar';
import { AuditStatsCards } from '@/components/audit/AuditStatsCards';
import {
  AuditLogFilters,
  AuditLogTimelineBucket,
  AuditLogTimePreset,
  DEFAULT_AUDIT_TIME_PRESET,
  FormattedAuditEntry,
} from '@/types/audit';
import { BUCKET_MS, startOfBucketUtc } from './aggregate-bucket';
import { runAuditExport } from './runAuditExport';
import { AuditTimelineHistogram } from './AuditTimelineHistogram';
import { AuditLogList } from './AuditLogList';
import { AuditLogDetailPanel } from './AuditLogDetailPanel';
import { AuditLogBulkActionsPanel } from './AuditLogBulkActionsPanel';
import { AuditDashboardGrid, type AuditDashboardWidgetDef } from './AuditDashboardGrid';
import {
  applyRowClick,
  pruneSelection,
  toggleSelection,
  EMPTY_AUDIT_SELECTION,
  type AuditSelectionState,
  type RowClickModifiers,
} from './auditSelection';

const PAGE_SIZE = 200;
/** Matches AuditLogList row height — minimum one visible row in the events widget. */
const AUDIT_LIST_ROW_HEIGHT = 36;

const AUDIT_EXPLORER_LAYOUT_ID = 'audit-explorer-split';
const AUDIT_EXPLORER_PANEL_IDS = ['audit-explorer-list', 'audit-explorer-detail'] as const;

/** No-op persistence when `localStorage` is unavailable (SSR / tests). Matches `LayoutStorage`. */
const NOOP_LAYOUT_STORAGE: LayoutStorage = {
  getItem: () => null,
  setItem: () => {},
};

/**
 * Bar count + bucket size for each rolling-window preset. Drives both the
 * range that gets queried and the number of bars the histogram renders, so
 * `last_30d` lands at exactly 30 day bars (today + 29 prior), `last_24h` at
 * 24 hour bars, `last_7d` at 7 day bars, etc.
 */
const PRESET_CONFIG: Record<
  Exclude<AuditLogTimePreset, 'custom' | 'all'>,
  { count: number; bucket: AuditLogTimelineBucket }
> = {
  last_15m: { count: 15, bucket: 'minute' },
  last_1h: { count: 60, bucket: 'minute' },
  last_24h: { count: 24, bucket: 'hour' },
  last_7d: { count: 7, bucket: 'day' },
  last_30d: { count: 30, bucket: 'day' },
};

function presetToRange(preset: Exclude<AuditLogTimePreset, 'custom'>): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  if (preset === 'all') {
    return {
      dateFrom: '1970-01-01T00:00:00.000Z',
      dateTo: now.toISOString(),
    };
  }
  const { count, bucket } = PRESET_CONFIG[preset];
  const span = BUCKET_MS[bucket];
  // Anchor at the start of the current bucket so every preset produces
  // exactly `count` bars, with the trailing bar covering the in-progress
  // bucket. dateTo is exclusive (end of current bucket) so the SQL filter
  // `created_at < dateTo` includes everything in the current bucket.
  const startOfCurrent = startOfBucketUtc(bucket, now).getTime();
  const dateFromMs = startOfCurrent - (count - 1) * span;
  const dateToMs = startOfCurrent + span;
  return {
    dateFrom: new Date(dateFromMs).toISOString(),
    dateTo: new Date(dateToMs).toISOString(),
  };
}

export interface AuditExplorerProps {
  organizationId: string;
  /** Seed for the non-time filters, used by ?entityType/?entityId deep links. */
  initialFilters?: Omit<AuditLogFilters, 'dateFrom' | 'dateTo'>;
}

export function AuditExplorer({ organizationId, initialFilters }: AuditExplorerProps) {
  const { canManageOrganization } = usePermissions();
  const canExport = canManageOrganization();

  const explorerLayout = useDefaultLayout({
    id: AUDIT_EXPLORER_LAYOUT_ID,
    storage:
      typeof globalThis !== 'undefined' && 'localStorage' in globalThis
        ? globalThis.localStorage
        : NOOP_LAYOUT_STORAGE,
    panelIds: [...AUDIT_EXPLORER_PANEL_IDS],
  });

  const [preset, setPreset] = useState<AuditLogTimePreset>(DEFAULT_AUDIT_TIME_PRESET);
  const [range, setRange] = useState(() => presetToRange(DEFAULT_AUDIT_TIME_PRESET));

  // Non-time filters (entity type / action / actor / search). Pagination resets
  // whenever any filter or the time range changes.
  const [otherFilters, setOtherFilters] = useState<
    Omit<AuditLogFilters, 'dateFrom' | 'dateTo'>
  >(() => initialFilters ?? {});
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<AuditSelectionState>(EMPTY_AUDIT_SELECTION);

  const filtersForQuery: AuditLogFilters = useMemo(
    () => ({
      ...otherFilters,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }),
    [otherFilters, range]
  );

  const bucket = useMemo(
    () => deriveTimelineBucket(range.dateFrom, range.dateTo),
    [range.dateFrom, range.dateTo]
  );

  const listQuery = useOrganizationAuditLog(organizationId, filtersForQuery, {
    page,
    pageSize: PAGE_SIZE,
  });
  const timelineQuery = useAuditTimeline(organizationId, {
    bucket,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    filters: otherFilters,
  });

  const entries = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data]
  );
  const totalCount = listQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressLabel, setExportProgressLabel] = useState<string | undefined>(
    undefined
  );
  const { exportToCsv, exportToJson } = useAuditExport(organizationId);

  // Drop selected ids that no longer exist when the entry list changes shape
  // so we never leave now-orphaned entries highlighted in the panels.
  const lastEntriesKeyRef = useRef<string>('');
  useEffect(() => {
    const key = entries.map((e) => e.id).join(',');
    if (key === lastEntriesKeyRef.current) return;
    lastEntriesKeyRef.current = key;
    setSelection((prev) => pruneSelection(prev, entries));
  }, [entries]);

  const selectedEntries = useMemo(
    () => entries.filter((e) => selection.ids.has(e.id)),
    [entries, selection.ids]
  );

  const selectedCount = selectedEntries.length;

  const clearSelection = () => setSelection(EMPTY_AUDIT_SELECTION);

  const handleRowClick = (entry: FormattedAuditEntry, modifiers: RowClickModifiers) => {
    setSelection((prev) => applyRowClick(prev, entries, entry, modifiers));
  };

  const handleCheckboxToggle = (entry: FormattedAuditEntry) => {
    setSelection((prev) => toggleSelection(prev, entry.id));
  };

  const handlePresetChange = (
    nextPreset: AuditLogTimePreset,
    isoFrom?: string,
    isoTo?: string
  ) => {
    setPreset(nextPreset);
    setPage(1);
    clearSelection();
    if (nextPreset === 'custom' && isoFrom && isoTo) {
      setRange({ dateFrom: isoFrom, dateTo: isoTo });
    } else if (nextPreset !== 'custom') {
      setRange(presetToRange(nextPreset));
    }
  };

  const handleBucketClick = (bucketIso: string) => {
    const bucketStart = new Date(bucketIso);
    if (Number.isNaN(bucketStart.getTime())) return;
    const bucketSpanMs = bucket === 'minute' ? 60_000 : bucket === 'hour' ? 3_600_000 : 86_400_000;
    const bucketEnd = new Date(bucketStart.getTime() + bucketSpanMs);
    setPreset('custom');
    setRange({
      dateFrom: bucketStart.toISOString(),
      dateTo: bucketEnd.toISOString(),
    });
    setPage(1);
    clearSelection();
  };

  const handleFilterChange = (next: AuditLogFilters) => {
    // The time range is owned by the picker, not the filter popover, so we
    // intentionally drop dateFrom / dateTo when reading filter changes back.
    setOtherFilters({
      entityType: next.entityType,
      action: next.action,
      actorId: next.actorId,
      entityId: next.entityId,
      search: next.search,
    });
    setPage(1);
    clearSelection();
  };

  const handleClearFilters = () => {
    setOtherFilters({});
    setPage(1);
    clearSelection();
  };

  const handleExportCsv = async () => {
    if (!canExport) return;
    await runAuditExport(
      (onProgress) => exportToCsv(filtersForQuery, onProgress),
      setExportProgressLabel,
      setIsExporting,
    );
  };

  const handleExportJson = async () => {
    if (!canExport) return;
    await runAuditExport(
      (onProgress) => exportToJson(filtersForQuery, onProgress),
      setExportProgressLabel,
      setIsExporting,
    );
  };

  const renderEventsWidget = (contentHeight: number) => {
    const paginationHeight = totalPages > 1 ? 40 : 0;
    const listHeight = Math.max(AUDIT_LIST_ROW_HEIGHT, contentHeight - paginationHeight);

    const list = (
      <AuditLogList
        entries={entries}
        selectedIds={selection.ids}
        onRowClick={handleRowClick}
        onCheckboxToggle={handleCheckboxToggle}
        onEscape={clearSelection}
        height={listHeight}
        isLoading={listQuery.isLoading}
        emptyState={
          <EmptyState
            icon={History}
            title="No audit entries found"
            description="Try adjusting your filters or widening the time range."
            className="border-0 bg-transparent"
          />
        }
      />
    );

    return (
      <div className="h-full flex flex-col" data-testid="audit-events-widget">
        <div className="flex-1 min-h-0">
          {selectedCount === 0 ? (
            // Full-width table until events are selected (#1166).
            <div style={{ height: listHeight }}>{list}</div>
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              style={{ height: listHeight }}
              id={AUDIT_EXPLORER_LAYOUT_ID}
              defaultLayout={explorerLayout.defaultLayout}
              onLayoutChanged={explorerLayout.onLayoutChanged}
              resizeTargetMinimumSize={{ coarse: 20, fine: 8 }}
            >
              <ResizablePanel id={AUDIT_EXPLORER_PANEL_IDS[0]} defaultSize={60} minSize={30}>
                {list}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id={AUDIT_EXPLORER_PANEL_IDS[1]} defaultSize={40} minSize={25}>
                {selectedCount === 1 ? (
                  <AuditLogDetailPanel
                    entry={selectedEntries[0] ?? null}
                    onClearSelection={clearSelection}
                  />
                ) : (
                  <AuditLogBulkActionsPanel
                    entries={selectedEntries}
                    onClearSelection={clearSelection}
                    canExport={canExport}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between border-t px-3 shrink-0"
            style={{ height: paginationHeight }}
          >
            <span className="text-xs text-muted-foreground">
              Showing {((page - 1) * PAGE_SIZE) + 1}
              {'\u2013'}
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}{' '}
              entries
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const widgets: AuditDashboardWidgetDef[] = [
    {
      id: 'metrics',
      title: 'Key Metrics',
      defaultH: 5,
      minH: 4,
      render: () => (
        <div className="h-full overflow-y-auto p-3">
          <AuditStatsCards organizationId={organizationId} />
        </div>
      ),
    },
    {
      id: 'timeline',
      title: 'Timeline',
      defaultH: 5,
      minH: 3,
      render: (contentHeight) => (
        <AuditTimelineHistogram
          data={timelineQuery.data ?? []}
          bucket={bucket}
          dateFrom={range.dateFrom}
          dateTo={range.dateTo}
          isLoading={timelineQuery.isLoading}
          onBucketClick={handleBucketClick}
          height={Math.max(64, contentHeight)}
        />
      ),
    },
    {
      id: 'events',
      title: 'Events',
      defaultH: 14,
      minH: 8,
      render: renderEventsWidget,
    },
  ];

  return (
    <div
      className="flex flex-col gap-3 min-h-[640px]"
      data-testid="audit-explorer"
    >
      <AuditLogToolbar
        filters={filtersForQuery}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        isExporting={isExporting}
        exportProgressLabel={exportProgressLabel}
        canExport={canExport}
        resultCount={totalCount}
        timePreset={preset}
        timeFromIso={preset === 'custom' ? range.dateFrom : undefined}
        timeToIso={preset === 'custom' ? range.dateTo : undefined}
        onTimeRangeChange={handlePresetChange}
      />

      <AuditDashboardGrid widgets={widgets} />
    </div>
  );
}
