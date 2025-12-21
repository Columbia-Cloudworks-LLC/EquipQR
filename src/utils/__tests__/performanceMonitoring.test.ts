import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../performanceMonitoring';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn()
  }
}));

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
}

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
  });

  afterEach(() => {
    vi.clearAllMocks();
    monitor.clearMetrics();
  });

  describe('getInstance', () => {
    it('returns a singleton instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('recordMetric', () => {
    it('records a metric value', () => {
      monitor.recordMetric('test-metric', 100);
      const summary = monitor.getMetrics('test-metric') as MetricSummary;
      
      expect(summary).toBeDefined();
      expect(summary.count).toBe(1);
      expect(summary.latest).toBe(100);
    });

    it('calculates average correctly', () => {
      monitor.recordMetric('avg-metric', 10);
      monitor.recordMetric('avg-metric', 20);
      monitor.recordMetric('avg-metric', 30);
      
      const summary = monitor.getMetrics('avg-metric') as MetricSummary;
      expect(summary.avg).toBe(20);
    });

    it('tracks min value', () => {
      monitor.recordMetric('min-metric', 50);
      monitor.recordMetric('min-metric', 10);
      monitor.recordMetric('min-metric', 30);
      
      const summary = monitor.getMetrics('min-metric') as MetricSummary;
      expect(summary.min).toBe(10);
    });

    it('tracks max value', () => {
      monitor.recordMetric('max-metric', 50);
      monitor.recordMetric('max-metric', 100);
      monitor.recordMetric('max-metric', 30);
      
      const summary = monitor.getMetrics('max-metric') as MetricSummary;
      expect(summary.max).toBe(100);
    });

    it('tracks count correctly', () => {
      monitor.recordMetric('count-metric', 1);
      monitor.recordMetric('count-metric', 2);
      monitor.recordMetric('count-metric', 3);
      monitor.recordMetric('count-metric', 4);
      
      const summary = monitor.getMetrics('count-metric') as MetricSummary;
      expect(summary.count).toBe(4);
    });
  });

  describe('getMetrics', () => {
    it('returns zero values for non-existent metric', () => {
      const summary = monitor.getMetrics('non-existent') as MetricSummary;
      expect(summary.count).toBe(0);
      expect(summary.avg).toBe(0);
    });

    it('returns all metrics when called without name', () => {
      monitor.recordMetric('metric-a', 10);
      monitor.recordMetric('metric-b', 20);
      
      const metrics = monitor.getMetrics() as Record<string, MetricSummary>;
      expect(metrics['metric-a']).toBeDefined();
      expect(metrics['metric-b']).toBeDefined();
    });
  });

  describe('startTimer', () => {
    it('returns a function to stop the timer', () => {
      const stopTimer = monitor.startTimer('timer-metric');
      expect(typeof stopTimer).toBe('function');
    });

    it('records elapsed time when stop function is called', async () => {
      const stopTimer = monitor.startTimer('timed-metric');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      stopTimer();
      
      const summary = monitor.getMetrics('timed-metric') as MetricSummary;
      expect(summary.count).toBe(1);
      expect(summary.latest).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearMetrics', () => {
    it('removes all recorded metrics', () => {
      monitor.recordMetric('clear-test', 100);
      const before = monitor.getMetrics('clear-test') as MetricSummary;
      expect(before.count).toBe(1);
      
      monitor.clearMetrics();
      
      const after = monitor.getMetrics('clear-test') as MetricSummary;
      expect(after.count).toBe(0);
    });

    it('removes specific metric when name is provided', () => {
      monitor.recordMetric('metric-a', 10);
      monitor.recordMetric('metric-b', 20);
      
      monitor.clearMetrics('metric-a');
      
      const summaryA = monitor.getMetrics('metric-a') as MetricSummary;
      const summaryB = monitor.getMetrics('metric-b') as MetricSummary;
      
      expect(summaryA.count).toBe(0);
      expect(summaryB.count).toBe(1);
    });
  });

  describe('destroy', () => {
    it('clears all metrics and disconnects observers', () => {
      monitor.recordMetric('destroy-test', 100);
      monitor.destroy();
      
      const summary = monitor.getMetrics('destroy-test') as MetricSummary;
      expect(summary.count).toBe(0);
    });
  });
});

