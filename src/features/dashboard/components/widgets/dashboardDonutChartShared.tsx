import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DonutChartDatum {
  status: string;
  label: string;
  count: number;
  color: string;
}

export function donutEntryPercent(count: number, totalCount: number): number {
  return totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
}

export function createDonutTooltipContent(
  totalCount: number,
  formatCountLine: (count: number, percentage: number) => string
) {
  return ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { label: string; count: number } }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const datum = payload[0]?.payload;
    if (!datum) return null;
    const percentage = donutEntryPercent(datum.count, totalCount);
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="font-medium">{datum.label}</p>
        <p>{formatCountLine(datum.count, percentage)}</p>
      </div>
    );
  };
}

export const DonutWidgetChartSkeleton: React.FC = () => (
  <div className="flex items-center gap-6">
    <Skeleton className="h-32 w-32 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  </div>
);

interface DonutWidgetMobileBreakdownProps {
  data: DonutChartDatum[];
  totalCount: number;
  mobileSummary: React.ReactNode;
  mobileTestId?: string;
  onSliceClick: (status: string) => void;
  labelClassName?: string;
}

export const DonutWidgetMobileBreakdown: React.FC<DonutWidgetMobileBreakdownProps> = ({
  data,
  totalCount,
  mobileSummary,
  mobileTestId,
  onSliceClick,
  labelClassName = 'capitalize text-foreground',
}) => (
  <div className="md:hidden space-y-3" data-testid={mobileTestId}>
    {mobileSummary}
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {data.map((entry) => {
        const pct = totalCount > 0 ? (entry.count / totalCount) * 100 : 0;
        if (pct <= 0) return null;
        return (
          <button
            key={`bar-${entry.status}`}
            type="button"
            style={{
              width: `${pct}%`,
              backgroundColor: entry.color,
            }}
            className="min-w-[4px] transition-opacity hover:opacity-90 touch-manipulation"
            onClick={() => onSliceClick(entry.status)}
            aria-label={`${entry.label}: ${entry.count}`}
          />
        );
      })}
    </div>
    <ul className="space-y-1.5">
      {data.map((entry) => {
        const pct = donutEntryPercent(entry.count, totalCount);
        return (
          <li key={entry.status}>
            <button
              type="button"
              onClick={() => onSliceClick(entry.status)}
              className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-2 py-2 text-left text-sm transition-colors hover:bg-muted/50 touch-manipulation min-h-[48px]"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className={cn('flex-1', labelClassName)}>{entry.label}</span>
              <span className="font-medium tabular-nums">{entry.count}</span>
              <span className="w-10 text-right text-muted-foreground tabular-nums text-xs">{pct}%</span>
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

interface DonutWidgetDesktopChartProps {
  data: DonutChartDatum[];
  totalCount: number;
  centerLabel: React.ReactNode;
  tooltipContent: React.ComponentProps<typeof Tooltip>['content'];
  onSliceClick: (status: string) => void;
  cellStrokeDasharray?: (index: number) => string | undefined;
  legendLabelClassName?: string;
}

export const DonutWidgetDesktopChart: React.FC<DonutWidgetDesktopChartProps> = ({
  data,
  totalCount,
  centerLabel,
  tooltipContent,
  onSliceClick,
  cellStrokeDasharray,
  legendLabelClassName = 'truncate capitalize text-muted-foreground',
}) => (
  <div className="hidden md:flex items-center justify-center">
    <div className="flex items-center gap-6">
      <div className="h-40 w-40 flex-shrink-0">
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx={80}
            cy={80}
            innerRadius={48}
            outerRadius={70}
            paddingAngle={2}
            onClick={(entry) => onSliceClick((entry as { status?: string }).status ?? '')}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.status}
                fill={entry.color}
                stroke="hsl(var(--card))"
                strokeWidth={3}
                strokeDasharray={cellStrokeDasharray?.(index)}
                style={{ cursor: 'pointer' }}
              />
            ))}
            {centerLabel}
          </Pie>
          <Tooltip content={tooltipContent} />
        </PieChart>
      </div>
      <div className="min-w-0 w-44 space-y-1.5">
        {data.map((entry) => {
          const pct = donutEntryPercent(entry.count, totalCount);
          return (
            <button
              key={entry.status}
              onClick={() => onSliceClick(entry.status)}
              className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-xs transition-colors hover:bg-muted/50 touch-manipulation"
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className={cn('flex-1', legendLabelClassName)}>{entry.label}</span>
              <span className="font-medium tabular-nums">{entry.count}</span>
              <span className="w-8 text-right text-muted-foreground tabular-nums">{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
