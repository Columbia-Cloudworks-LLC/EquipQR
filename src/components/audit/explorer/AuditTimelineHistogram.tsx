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
import EmptyState from '@/components/ui/empty-state';
import {
  ACTION_SEVERITY_COLOR,
  AUDIT_ACTIONS,
  AuditAction,
  AuditLogTimelineBucket,
  AuditLogTimelineRow,
} from '@/types/audit';

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
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState
          icon={Activity}
          title="No activity in this range"
          description="Try widening the time range above."
          className="border-0 bg-transparent py-2"
        />
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
                const bucketIso = (payload as { bucket?: string } | undefined)?.bucket;
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
