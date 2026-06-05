import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createDonutTooltipContent, type DonutChartDatum } from './dashboardDonutChartShared';

type StatusCountEntry = {
  status: string;
  label: string;
  count: number;
  color?: string;
};

export function useDonutStatusCountTotal(data: StatusCountEntry[] | undefined) {
  return React.useMemo(
    () => (data ?? []).reduce((sum, item) => sum + item.count, 0),
    [data],
  );
}

export function useDonutStatusChartData(
  data: StatusCountEntry[] | undefined,
  resolveColor: (status: string, entry: StatusCountEntry) => string,
) {
  return React.useMemo<DonutChartDatum[] | undefined>(
    () =>
      data?.map((entry) => ({
        status: entry.status,
        label: entry.label,
        count: entry.count,
        color: entry.color ?? resolveColor(entry.status, entry),
      })),
    [data, resolveColor],
  );
}

export function useDonutSliceNavigate(pathTemplate: (status: string) => string) {
  const navigate = useNavigate();
  return React.useCallback(
    (status: string) => {
      navigate(pathTemplate(status));
    },
    [navigate, pathTemplate],
  );
}

export function useDonutTooltipFormatter(
  totalCount: number,
  formatCountLine: (count: number, percentage: number) => string,
) {
  return React.useMemo(
    () => createDonutTooltipContent(totalCount, formatCountLine),
    [totalCount, formatCountLine],
  );
}
