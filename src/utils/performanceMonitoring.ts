// Performance monitoring utilities for the optimization plan
import { logger } from '@/utils/logger';

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.fetchStart);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(`resource-${resourceEntry.initiatorType}`, resourceEntry.duration);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('lcp', entry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Log significant performance issues
    if (name === 'page-load' && value > 3000) {
      logger.warn(`Slow page load detected: ${value}ms`);
    }
    if (name === 'lcp' && value > 2500) {
      logger.warn(`Poor LCP detected: ${value}ms`);
    }
  }

  startTimer(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      this.recordMetric(name, endTime - startTime);
    };
  }

  getMetrics(name?: string): MetricSummary | Record<string, MetricSummary> {
    if (name) {
      const values = this.metrics.get(name) || [];
      return {
        count: values.length,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        latest: values[values.length - 1] || 0
      };
    }

    const result: Record<string, MetricSummary> = {};
    for (const [key, values] of this.metrics.entries()) {
      result[key] = {
        count: values.length,
        avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        latest: values[values.length - 1] || 0
      };
    }
    return result;
  }

  clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// React hook for performance monitoring
export function usePerformanceTimer(name: string, enabled = true) {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    startTimer: () => enabled ? monitor.startTimer(name) : () => {},
    recordMetric: (value: number) => enabled ? monitor.recordMetric(name, value) : undefined,
    getMetrics: () => monitor.getMetrics(name)
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();