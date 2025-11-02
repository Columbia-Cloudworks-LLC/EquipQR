import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface PerformanceMetric {
  functionName: string;
  executionTime: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface PerformanceSummary {
  totalCalls: number;
  successRate: number;
  averageTime: number;
  fastestTime: number;
  slowestTime: number;
  recentErrors: string[];
}

export const useInvitationPerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startTimer = useCallback(() => {
    return performance.now();
  }, []);

  const endTimer = useCallback((
    startTime: number, 
    functionName: string, 
    success: boolean, 
    error?: string
  ) => {
    const executionTime = performance.now() - startTime;
    const metric: PerformanceMetric = {
      functionName,
      executionTime,
      success,
      error,
      timestamp: Date.now()
    };

    setMetrics(prev => [...prev.slice(-99), metric]); // Keep last 100 metrics

    // Log to database (non-blocking)
    if (isMonitoring) {
      (async () => {
        try {
          await supabase.rpc('log_invitation_performance', {
            function_name: functionName,
            execution_time_ms: executionTime,
            success,
            error_message: error || null
          });
        } catch (rpcError) {
          logger.warn('Failed to log invitation performance metric', rpcError);
        }
      })();
    }

    return executionTime;
  }, [isMonitoring]);

  const getSummary = useCallback((functionName?: string): PerformanceSummary => {
    const relevantMetrics = functionName 
      ? metrics.filter(m => m.functionName === functionName)
      : metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalCalls: 0,
        successRate: 100,
        averageTime: 0,
        fastestTime: 0,
        slowestTime: 0,
        recentErrors: []
      };
    }

    const successCount = relevantMetrics.filter(m => m.success).length;
    const executionTimes = relevantMetrics.map(m => m.executionTime);
    const recentErrors = relevantMetrics
      .filter(m => !m.success && m.error)
      .slice(-5)
      .map(m => m.error!)
      .filter((error, index, arr) => arr.indexOf(error) === index); // Unique errors

    return {
      totalCalls: relevantMetrics.length,
      successRate: (successCount / relevantMetrics.length) * 100,
      averageTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      fastestTime: Math.min(...executionTimes),
      slowestTime: Math.max(...executionTimes),
      recentErrors
    };
  }, [metrics]);

  const getAverageTime = useCallback((functionName?: string): number => {
    const summary = getSummary(functionName);
    return summary.averageTime;
  }, [getSummary]);

  const getSuccessRate = useCallback((functionName?: string): number => {
    const summary = getSummary(functionName);
    return summary.successRate;
  }, [getSummary]);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  const enableMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const disableMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const getHealthStatus = useCallback((): 'healthy' | 'warning' | 'critical' => {
    const summary = getSummary();
    
    if (summary.totalCalls === 0) return 'healthy';
    
    const avgTime = summary.averageTime;
    const successRate = summary.successRate;
    
    if (successRate < 80 || avgTime > 5000) return 'critical';
    if (successRate < 95 || avgTime > 2000) return 'warning';
    
    return 'healthy';
  }, [getSummary]);

  return {
    metrics,
    startTimer,
    endTimer,
    getSummary,
    getAverageTime,
    getSuccessRate,
    clearMetrics,
    enableMonitoring,
    disableMonitoring,
    isMonitoring,
    getHealthStatus
  };
};