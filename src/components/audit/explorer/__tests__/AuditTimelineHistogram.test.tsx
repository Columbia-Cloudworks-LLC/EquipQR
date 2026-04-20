import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ACTION_SEVERITY_COLOR, AuditLogTimelineRow } from '@/types/audit';
import { AuditTimelineHistogram } from '../AuditTimelineHistogram';

// Capture each Bar's onClick prop so we can fire it deterministically below.
type CapturedBar = { dataKey: string; fill: string; onClick?: (data: unknown) => void };
const capturedBars: CapturedBar[] = [];

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
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
  });

  it('renders a skeleton placeholder while loading', () => {
    render(<AuditTimelineHistogram data={[]} bucket="hour" isLoading />);
    expect(screen.getByTestId('audit-timeline-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('audit-timeline-histogram')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no rows', () => {
    render(<AuditTimelineHistogram data={[]} bucket="hour" />);
    expect(screen.getByText(/No activity in this range/i)).toBeInTheDocument();
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
});
