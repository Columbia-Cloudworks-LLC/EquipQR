// Navigation debugging utilities for work order details
let lastNavigationEvent: string | null = null;
let navigationEventCount = 0;

export const logNavigationEvent = (event: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    navigationEventCount++;
    lastNavigationEvent = event;
    
    // Only log unique events or every 5th event to reduce noise
    if (navigationEventCount === 1 || navigationEventCount % 5 === 0 || event !== lastNavigationEvent) {
      console.log(`🧭 Navigation [${navigationEventCount}]:`, event, data || '');
    }
  }
};

export const getNavigationStats = () => {
  return {
    lastEvent: lastNavigationEvent,
    eventCount: navigationEventCount
  };
};

export const resetNavigationStats = () => {
  lastNavigationEvent = null;
  navigationEventCount = 0;
};
