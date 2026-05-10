export interface StatsCardTrendForA11y {
  direction: 'up' | 'down' | 'flat';
  delta: number;
}

/** Plain-language summary for assistive tech; pairs with a decorative sparkline chart. */
export function formatStatsCardSparklineDescription(
  metricLabel: string,
  sparklineValues: number[],
  trend?: StatsCardTrendForA11y,
  trendNote?: string
): string {
  const series = sparklineValues.join(', ');
  const dayCount = sparklineValues.length;
  const parts: string[] = [
    `Recent ${dayCount}-day trend for ${metricLabel}: daily values ${series}.`,
  ];
  if (trend) {
    if (trend.direction === 'flat') {
      parts.push(`Compared to the prior week, change is flat (${trend.delta}%).`);
    } else {
      const directionWord = trend.direction === 'up' ? 'increased' : 'decreased';
      parts.push(`Compared to the prior week, this metric ${directionWord} by ${trend.delta}%.`);
    }
  }
  if (trendNote?.trim()) {
    parts.push(trendNote.trim());
  }
  return parts.join(' ');
}
