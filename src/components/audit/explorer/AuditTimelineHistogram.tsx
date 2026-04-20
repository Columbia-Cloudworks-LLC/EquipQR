/**
 * AuditTimelineHistogram — Recharts stacked-bar visualization of audit-event
 * volume over time, color-coded by action severity (issue #641). Click a bar
 * to narrow the explorer to that bucket's range.
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format as formatDate } from 'date-fns';
import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ACTION_SEVERITY_COLOR,
  AUDIT_ACTIONS,
  AuditAction,
  AuditLogTimelineBucket,
  AuditLogTimelineRow,
} from '@/types/audit';

function readBucketIsoFromBarClick(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const o = payload as Record<string, unknown>;
  if (typeof o.bucket === 'string') return o.bucket;
  const inner = o.payload;
  if (inner && typeof inner === 'object' && 'bucket' in inner) {
    const b = (inner as { bucket: unknown }).bucket;
    if (typeof b === 'string') return b;
  }
  return undefined;
}

const BUCKET_LABEL_FORMAT: Record<AuditLogTimelineBucket, string> = {
  minute: 'HH:mm',
  hour: 'MMM d HH:mm',
  day: 'MMM d',
};

interface ChartRow {
  bucket: string;
  bucketLabel: string;
  total: number;
  INSERT: number;
  UPDATE: number;
  DELETE: number;
}

export interface AuditTimelineHistogramProps {
  data: AuditLogTimelineRow[];
  bucket: AuditLogTimelineBucket;
  isLoading?: boolean;
  onBucketClick?: (bucketIso: string) => void;
  height?: number;
}

function aggregateByBucket(
  rows: AuditLogTimelineRow[],
  bucket: AuditLogTimelineBucket
): ChartRow[] {
  const map = new Map<string, ChartRow>();

  for (const row of rows) {
    const existing = map.get(row.bucket) ?? {
      bucket: row.bucket,
      bucketLabel: formatDate(new Date(row.bucket), BUCKET_LABEL_FORMAT[bucket]),
      total: 0,
      INSERT: 0,
      UPDATE: 0,
      DELETE: 0,
    };
    existing[row.action] = (existing[row.action] ?? 0) + row.count;
    existing.total += row.count;
    map.set(row.bucket, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function AuditTimelineHistogram({
  data,
  bucket,
  isLoading = false,
  onBucketClick,
  height = 96,
}: AuditTimelineHistogramProps) {
  const chartData = useMemo(() => aggregateByBucket(data, bucket), [data, bucket]);

  if (isLoading) {
    return (
      <div
        style={{ height }}
        className="flex items-end gap-px px-3 py-2"
        data-testid="audit-timeline-skeleton"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${20 + ((i * 17) % 60)}%` }}
          />
        ))}
      </div>
    );
  }

  if (!chartData.length) {
    // Keep empty UI within `height` — the shared EmptyState uses py-12 + large
    // title/description and overflows this short slot, painting over the toolbar
    // above (overflow: visible). Compact copy only; no full-page empty pattern.
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-0.5 overflow-hidden px-3 text-center"
        data-testid="audit-timeline-empty"
      >
        <Activity
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="text-[11px] font-medium leading-tight text-muted-foreground">
          No activity in this range
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground/80">
          Widen the time range above
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }} data-testid="audit-timeline-histogram">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 6, right: 12, left: 8, bottom: 4 }}
        >
          <XAxis
            dataKey="bucketLabel"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 11,
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          {(Object.values(AUDIT_ACTIONS) as AuditAction[]).map((action) => (
            <Bar
              key={action}
              dataKey={action}
              stackId="actions"
              fill={ACTION_SEVERITY_COLOR[action]}
              cursor={onBucketClick ? 'pointer' : 'default'}
              onClick={(payload: unknown) => {
                if (!onBucketClick) return;
                const bucketIso = readBucketIsoFromBarClick(payload);
                if (bucketIso) onBucketClick(bucketIso);
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AuditTimelineHistogram;
