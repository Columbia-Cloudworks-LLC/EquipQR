/**
 * AuditExplorer — top-level shell for the new /audit-log experience
 * (issue #641). Composes the time-range picker, the timeline histogram,
 * and a resizable list / detail two-pane below it. Owns the explorer's
 * filters / preset / selection / pagination state.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  AuditLogFilters,
  AuditLogTimelineBucket,
  AuditLogTimePreset,
  DEFAULT_AUDIT_TIME_PRESET,
  FormattedAuditEntry,
} from '@/types/audit';
import { AuditTimelineHistogram } from './AuditTimelineHistogram';
import { AuditLogList } from './AuditLogList';
import { AuditLogDetailPanel } from './AuditLogDetailPanel';

const PAGE_SIZE = 200;

/**
 * Bucket size in milliseconds. Mirrors `date_trunc(p_bucket, ...)` semantics
 * in the get_audit_log_timeline RPC and matches BUCKET_MS in
 * AuditTimelineHistogram so dense bar grids align with the SQL output.
 */
const BUCKET_MS: Record<AuditLogTimelineBucket, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
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

/**
 * Truncate a timestamp to the start of its UTC bucket — matches PostgreSQL
 * `date_trunc(p_bucket, timestamptz)` running in the default UTC session
 * timezone. Local-time helpers from date-fns would skew bucket boundaries
 * for non-UTC clients, so we pin the math to UTC here.
 */
function startOfBucketUtc(bucket: AuditLogTimelineBucket, when: Date): Date {
  const d = new Date(when.getTime());
  switch (bucket) {
    case 'minute':
      d.setUTCSeconds(0, 0);
      break;
    case 'hour':
      d.setUTCMinutes(0, 0, 0);
      break;
    case 'day':
      d.setUTCHours(0, 0, 0, 0);
      break;
  }
  return d;
}

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
}

export function AuditExplorer({ organizationId }: AuditExplorerProps) {
  const { canManageOrganization } = usePermissions();
  const canExport = canManageOrganization();

  const [preset, setPreset] = useState<AuditLogTimePreset>(DEFAULT_AUDIT_TIME_PRESET);
  const [range, setRange] = useState(() => presetToRange(DEFAULT_AUDIT_TIME_PRESET));

  // Non-time filters (entity type / action / actor / search). Pagination resets
  // whenever any filter or the time range changes.
  const [otherFilters, setOtherFilters] = useState<
    Omit<AuditLogFilters, 'dateFrom' | 'dateTo'>
  >({});
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<FormattedAuditEntry | null>(
    null
  );

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

  // Reset selection when the underlying entry list changes shape so we never
  // leave a now-orphaned entry highlighted in the detail panel.
  const lastEntriesKeyRef = useRef<string>('');
  useEffect(() => {
    const key = entries.map((e) => e.id).join(',');
    if (key === lastEntriesKeyRef.current) return;
    lastEntriesKeyRef.current = key;
    if (selectedEntry && !entries.some((e) => e.id === selectedEntry.id)) {
      setSelectedEntry(null);
    }
  }, [entries, selectedEntry]);

  const handlePresetChange = (
    nextPreset: AuditLogTimePreset,
    isoFrom?: string,
    isoTo?: string
  ) => {
    setPreset(nextPreset);
    setPage(1);
    setSelectedEntry(null);
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
    setSelectedEntry(null);
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
    setSelectedEntry(null);
  };

  const handleClearFilters = () => {
    setOtherFilters({});
    setPage(1);
    setSelectedEntry(null);
  };

  const handleExportCsv = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setExportProgressLabel('Preparing export...');
    try {
      await exportToCsv(filtersForQuery, ({ current, total }) => {
        setExportProgressLabel(
          total === 0
            ? 'No matching records found.'
            : `Exporting ${current.toLocaleString()} of ${total.toLocaleString()} records...`
        );
      });
    } finally {
      setIsExporting(false);
      setExportProgressLabel(undefined);
    }
  };

  const handleExportJson = async () => {
    if (!canExport) return;
    setIsExporting(true);
    setExportProgressLabel('Preparing export...');
    try {
      await exportToJson(filtersForQuery, ({ current, total }) => {
        setExportProgressLabel(
          total === 0
            ? 'No matching records found.'
            : `Exporting ${current.toLocaleString()} of ${total.toLocaleString()} records...`
        );
      });
    } finally {
      setIsExporting(false);
      setExportProgressLabel(undefined);
    }
  };

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

      <div className="rounded-md border bg-card overflow-hidden">
        <AuditTimelineHistogram
          data={timelineQuery.data ?? []}
          bucket={bucket}
          dateFrom={range.dateFrom}
          dateTo={range.dateTo}
          isLoading={timelineQuery.isLoading}
          onBucketClick={handleBucketClick}
        />
      </div>

      <div className="rounded-md border overflow-hidden bg-card">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="audit-explorer-split"
          className="h-[480px]"
        >
          <ResizablePanel defaultSize={60} minSize={30}>
            <AuditLogList
              entries={entries}
              selectedId={selectedEntry?.id ?? null}
              onSelect={setSelectedEntry}
              height={480}
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
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={25}>
            <AuditLogDetailPanel entry={selectedEntry} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
}

export default AuditExplorer;
