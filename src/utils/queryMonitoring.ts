interface QueryLog {
  query: string;
  params?: unknown;
  duration: number;
  timestamp: Date;
  indexes_used?: string[];
  performance_notes?: string;
}

import { logger } from '@/utils/logger';

class QueryMonitor {
  private logs: QueryLog[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';

  logQuery(log: QueryLog) {
    if (!this.isEnabled) return;
    
    this.logs.push(log);
    
    // Keep only last 100 queries to prevent memory leaks
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Log slow queries
    if (log.duration > 1000) {
      logger.warn('🐌 Slow query detected:', {
        query: log.query,
        duration: `${log.duration}ms`,
        timestamp: log.timestamp,
        params: log.params
      });
    }

    // Log for debugging
    if (log.duration > 500) {
      logger.debug('⚡ Query performance:', {
        query: log.query.substring(0, 100) + '...',
        duration: `${log.duration}ms`,
        indexes_used: log.indexes_used
      });
    }
  }

  getSlowQueries(thresholdMs = 500): QueryLog[] {
    return this.logs.filter(log => log.duration > thresholdMs);
  }

  getQueryStats() {
    if (this.logs.length === 0) return null;

    const durations = this.logs.map(log => log.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      totalQueries: this.logs.length,
      averageDuration: Math.round(avg),
      maxDuration: max,
      minDuration: min,
      slowQueries: this.getSlowQueries().length
    };
  }

  clearLogs() {
    this.logs = [];
  }
}

export const queryMonitor = new QueryMonitor();

// Utility to wrap Supabase queries with monitoring
export function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  expectedIndexes?: string[]
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery({
        query: queryName,
        duration,
        timestamp: new Date(),
        indexes_used: expectedIndexes,
        performance_notes: expectedIndexes ? 'Using optimized indexes' : 'Standard query'
      });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery({
        query: queryName,
        duration,
        timestamp: new Date(),
        performance_notes: `Error: ${error.message}`
      });
      throw error;
    });
}

// Performance monitoring utilities
export const performanceUtils = {
  logIndexUsage: (queryName: string, indexes: string[]) => {
    logger.debug(`🔍 Query "${queryName}" should use indexes:`, indexes);
  },

  warnMissingIndex: (queryName: string, missingIndex: string) => {
    logger.warn(`⚠️ Query "${queryName}" may benefit from index:`, missingIndex);
  },

  reportQueryStats: () => {
    const stats = queryMonitor.getQueryStats();
    if (stats) {
      // Use info for tables to keep errors reserved for real errors
      logger.info('Query stats', stats);
    }
  }
};
