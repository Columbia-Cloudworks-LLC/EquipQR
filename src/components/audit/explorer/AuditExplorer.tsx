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
  AuditLogTimePreset,
  FormattedAuditEntry,
} from '@/types/audit';
import { AuditTimelineHistogram } from './AuditTimelineHistogram';
import { AuditLogTimeRangePicker } from './AuditLogTimeRangePicker';
import { AuditLogList } from './AuditLogList';
import { AuditLogDetailPanel } from './AuditLogDetailPanel';

const PAGE_SIZE = 200;

const PRESET_OFFSET_MS: Record<Exclude<AuditLogTimePreset, 'custom'>, number> = {
  last_15m: 15 * 60 * 1000,
  last_1h: 60 * 60 * 1000,
  last_24h: 24 * 60 * 60 * 1000,
  last_7d: 7 * 24 * 60 * 60 * 1000,
  last_30d: 30 * 24 * 60 * 60 * 1000,
};

function presetToRange(preset: Exclude<AuditLogTimePreset, 'custom'>): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  return {
    dateFrom: new Date(now.getTime() - PRESET_OFFSET_MS[preset]).toISOString(),
    dateTo: now.toISOString(),
  };
}

export interface AuditExplorerProps {
  organizationId: string;
}

export function AuditExplorer({ organizationId }: AuditExplorerProps) {
  const { canManageOrganization } = usePermissions();
  const canExport = canManageOrganization();

  const [preset, setPreset] = useState<AuditLogTimePreset>('last_24h');
  const [range, setRange] = useState(() => presetToRange('last_24h'));

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

  const entries = listQuery.data?.data ?? [];
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
    // Strip the dateFrom / dateTo back out — those are governed by the picker.
    const { dateFrom: _df, dateTo: _dt, ...rest } = next;
    setOtherFilters(rest);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <AuditLogTimeRangePicker
          preset={preset}
          isoFrom={preset === 'custom' ? range.dateFrom : undefined}
          isoTo={preset === 'custom' ? range.dateTo : undefined}
          onChange={handlePresetChange}
        />
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {totalCount.toLocaleString()} {totalCount === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="rounded-md border bg-card">
        <AuditTimelineHistogram
          data={timelineQuery.data ?? []}
          bucket={bucket}
          isLoading={timelineQuery.isLoading}
          onBucketClick={handleBucketClick}
        />
      </div>

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
      />

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
