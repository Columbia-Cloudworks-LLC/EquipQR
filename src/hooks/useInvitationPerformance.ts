import { useCallback, useRef } from 'react';

interface PerformanceMetrics {
  operationName: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export const useInvitationPerformance = () => {
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  const startTimer = useCallback(() => {
    return performance.now();
  }, []);

  const endTimer = useCallback((
    startTime: number,
    operationName: string,
    success: boolean,
    error?: string
  ) => {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      operationName,
      duration,
      success,
      error,
      timestamp: Date.now()
    };

    metricsRef.current.push(metric);
    
    // Keep only last 50 metrics
    if (metricsRef.current.length > 50) {
      metricsRef.current = metricsRef.current.slice(-50);
    }

    // Log performance warning if operation is slow
    if (duration > 5000) {
      console.warn(`[PERFORMANCE] Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    } else if (duration > 2000) {
      // Performance warning: operation took longer than expected
    }

    return metric;
  }, []);

  const getMetrics = useCallback(() => {
    return [...metricsRef.current];
  }, []);

  const getAverageTime = useCallback((operationName?: string) => {
    const relevantMetrics = operationName 
      ? metricsRef.current.filter(m => m.operationName === operationName)
      : metricsRef.current;

    if (relevantMetrics.length === 0) return 0;

    const totalTime = relevantMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / relevantMetrics.length;
  }, []);

  const getSuccessRate = useCallback((operationName?: string) => {
    const relevantMetrics = operationName 
      ? metricsRef.current.filter(m => m.operationName === operationName)
      : metricsRef.current;

    if (relevantMetrics.length === 0) return 100;

    const successCount = relevantMetrics.filter(m => m.success).length;
    return (successCount / relevantMetrics.length) * 100;
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
  }, []);

  return {
    startTimer,
    endTimer,
    getMetrics,
    getAverageTime,
    getSuccessRate,
    clearMetrics
  };
};
