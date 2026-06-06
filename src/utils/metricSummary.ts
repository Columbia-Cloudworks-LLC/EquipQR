export type MetricSummary = {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
};

export function summarizeMetricValues(values: number[]): MetricSummary {
  return {
    count: values.length,
    avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    latest: values[values.length - 1] || 0,
  };
}
