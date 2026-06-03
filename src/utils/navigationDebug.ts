// Navigation debugging utilities for work order details
let lastNavigationEvent: string | null = null;
let navigationEventCount = 0;

import { logger } from '@/utils/logger';

export const logNavigationEvent = (event: string, data?: unknown) => {
  navigationEventCount++;
  lastNavigationEvent = event;
  
  // Only log unique events or every 5th event to reduce noise
  if (navigationEventCount === 1 || navigationEventCount % 5 === 0 || event !== lastNavigationEvent) {
    logger.debug(`🧭 Navigation [${navigationEventCount}]: ${event}`, data || '');
  }
};

const getNavigationStats = () => {
  return {
    lastEvent: lastNavigationEvent,
    eventCount: navigationEventCount
  };
};

const resetNavigationStats = () => {
  lastNavigationEvent = null;
  navigationEventCount = 0;
};
