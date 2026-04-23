import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ACTION_SEVERITY_COLOR, AuditLogTimelineRow } from '@/types/audit';
import { AuditTimelineHistogram } from '../AuditTimelineHistogram';
import { aggregateByBucket } from '../aggregate-bucket';

// Capture each Bar's onClick prop so we can fire it deterministically below.
type CapturedBar = { dataKey: string; fill: string; onClick?: (data: unknown) => void };
const capturedBars: CapturedBar[] = [];

interface CapturedChartData {
  bucket: string;
  total: number;
  INSERT: number;
  UPDATE: number;
  DELETE: number;
}
const capturedChartData: CapturedChartData[][] = [];

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({
    data,
    children,
  }: {
    data: CapturedChartData[];
    children: React.ReactNode;
  }) => {
    capturedChartData.push(data);
    return <div data-testid="bar-chart">{children}</div>;
  },
  Bar: ({
    dataKey,
    fill,
    onClick,
  }: {
    dataKey: string;
    fill: string;
    onClick?: (data: unknown) => void;
  }) => {
    capturedBars.push({ dataKey, fill, onClick });
    return <div data-testid={`bar-${dataKey}`} data-fill={fill} />;
  },
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const sampleRows: AuditLogTimelineRow[] = [
  { bucket: '2026-04-20T10:00:00.000Z', action: 'INSERT', count: 3 },
  { bucket: '2026-04-20T10:00:00.000Z', action: 'UPDATE', count: 1 },
  { bucket: '2026-04-20T11:00:00.000Z', action: 'DELETE', count: 2 },
];

describe('AuditTimelineHistogram', () => {
  beforeEach(() => {
    capturedBars.length = 0;
    capturedChartData.length = 0;
  });

  it('renders a skeleton placeholder while loading', () => {
    render(<AuditTimelineHistogram data={[]} bucket="hour" isLoading />);
    expect(screen.getByTestId('audit-timeline-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-timeline-histogram')).not.toBeInTheDocument();
  });

  it('renders a compact empty slot when there are no rows', () => {
    render(<AuditTimelineHistogram data={[]} bucket="hour" />);
    expect(screen.getByTestId('audit-timeline-empty')).toBeInTheDocument();
    expect(screen.getByText(/No activity in this range/i)).toBeInTheDocument();
    expect(screen.getByText(/Widen the time range above/i)).toBeInTheDocument();
  });

  it('renders one stacked Bar per audit action with the severity color map', () => {
    render(<AuditTimelineHistogram data={sampleRows} bucket="hour" />);

    expect(screen.getByTestId('audit-timeline-histogram')).toBeInTheDocument();
    expect(screen.getByTestId('bar-INSERT')).toHaveAttribute(
      'data-fill',
      ACTION_SEVERITY_COLOR.INSERT
    );
    expect(screen.getByTestId('bar-UPDATE')).toHaveAttribute(
      'data-fill',
      ACTION_SEVERITY_COLOR.UPDATE
    );
    expect(screen.getByTestId('bar-DELETE')).toHaveAttribute(
      'data-fill',
      ACTION_SEVERITY_COLOR.DELETE
    );
  });

  it('forwards bucket-click payloads to the onBucketClick callback', () => {
    const onBucketClick = vi.fn();
    render(
      <AuditTimelineHistogram
        data={sampleRows}
        bucket="hour"
        onBucketClick={onBucketClick}
      />
    );

    // Trigger the Bar's onClick with a Recharts-shaped payload that includes
    // the aggregated row's bucket. Any of the three captured Bars should
    // forward the same bucket value.
    const insertBar = capturedBars.find((b) => b.dataKey === 'INSERT');
    expect(insertBar?.onClick).toBeTypeOf('function');
    insertBar?.onClick?.({ bucket: '2026-04-20T10:00:00.000Z' });

    expect(onBucketClick).toHaveBeenCalledWith('2026-04-20T10:00:00.000Z');
  });

  it('reads bucket from nested Recharts-style payload when present', () => {
    const onBucketClick = vi.fn();
    render(
      <AuditTimelineHistogram
        data={sampleRows}
        bucket="hour"
        onBucketClick={onBucketClick}
      />
    );

    const insertBar = capturedBars.find((b) => b.dataKey === 'INSERT');
    insertBar?.onClick?.({ payload: { bucket: '2026-04-20T11:00:00.000Z' } });

    expect(onBucketClick).toHaveBeenCalledWith('2026-04-20T11:00:00.000Z');
  });

  it('does not invoke onBucketClick when the click payload has no bucket', () => {
    const onBucketClick = vi.fn();
    render(
      <AuditTimelineHistogram
        data={sampleRows}
        bucket="day"
        onBucketClick={onBucketClick}
      />
    );

    capturedBars[0]?.onClick?.({});
    expect(onBucketClick).not.toHaveBeenCalled();
  });

  it('densifies the bucket grid across the supplied range with zero-fill', () => {
    const dataRows: AuditLogTimelineRow[] = [
      { bucket: '2026-04-19T00:00:00+00:00', action: 'INSERT', count: 5 },
    ];
    render(
      <AuditTimelineHistogram
        data={dataRows}
        bucket="day"
        dateFrom="2026-04-13T00:00:00.000Z"
        dateTo="2026-04-22T00:00:00.000Z"
      />
    );

    // 9 day buckets: Apr 13 through Apr 21 (dateTo is the exclusive upper bound,
    // so Apr 22 is not rendered — mirrors AuditExplorer.presetToRange() semantics).
    const lastChart = capturedChartData.at(-1);
    expect(lastChart).toHaveLength(9);

    const apr19 = lastChart?.find((r) => r.bucket === '2026-04-19T00:00:00.000Z');
    expect(apr19?.INSERT).toBe(5);
    expect(apr19?.total).toBe(5);

    const apr14 = lastChart?.find((r) => r.bucket === '2026-04-14T00:00:00.000Z');
    expect(apr14).toBeDefined();
    expect(apr14?.INSERT).toBe(0);
    expect(apr14?.total).toBe(0);
  });

  it('falls back to sparse aggregation for very wide ranges (e.g. all-time)', () => {
    const dataRows: AuditLogTimelineRow[] = [
      { bucket: '2026-04-20T00:00:00+00:00', action: 'INSERT', count: 7 },
    ];
    render(
      <AuditTimelineHistogram
        data={dataRows}
        bucket="day"
        dateFrom="1970-01-01T00:00:00.000Z"
        dateTo="2026-04-20T00:00:00.000Z"
      />
    );

    // Above MAX_DENSE_BUCKETS the chart contains only the buckets present in
    // the RPC response, not 20,000+ daily zero buckets.
    const lastChart = capturedChartData.at(-1);
    expect(lastChart).toHaveLength(1);
    expect(lastChart?.[0].INSERT).toBe(7);
  });
});

describe('aggregateByBucket', () => {
  it('produces 24 hour buckets across a 24-hour range', () => {
    const dateFrom = '2026-04-19T13:00:00.000Z';
    // dateTo is the exclusive upper bound — the first bucket NOT rendered.
    // Mirrors AuditExplorer.presetToRange(): dateToMs = startOfCurrent + span.
    // With dateFrom=13:00 and dateTo=13:00 next day, ms < toMs generates
    // 24 bars: Apr 19 13:00 (hour 0) through Apr 20 12:00 (hour 23).
    const dateTo = '2026-04-20T13:00:00.000Z';
    const rows = aggregateByBucket([], 'hour', dateFrom, dateTo);
    expect(rows).toHaveLength(24);
    expect(rows[0].bucket).toBe('2026-04-19T13:00:00.000Z');
    expect(rows.at(-1)?.bucket).toBe('2026-04-20T12:00:00.000Z');
  });

  it('merges PostgREST `+00:00` ISO formats into the same bucket key', () => {
    const rows = aggregateByBucket(
      [
        { bucket: '2026-04-20T00:00:00+00:00', action: 'INSERT', count: 3 },
        { bucket: '2026-04-20T00:00:00.000Z', action: 'UPDATE', count: 2 },
      ],
      'day',
      '2026-04-20T00:00:00.000Z',
      '2026-04-20T00:00:00.000Z'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].INSERT).toBe(3);
    expect(rows[0].UPDATE).toBe(2);
    expect(rows[0].total).toBe(5);
  });
});
