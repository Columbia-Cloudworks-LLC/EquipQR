/* eslint-disable no-console */

export interface Logger {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

const isDevelopment = import.meta.env.DEV;

// Rate limiting to prevent spam
const logCache = new Map<string, number>();
const RATE_LIMIT_MS = 5000; // 5 seconds

const shouldLog = (message: string): boolean => {
  if (!isDevelopment) return false;
  
  const now = Date.now();
  const lastLog = logCache.get(message);
  
  if (lastLog && now - lastLog < RATE_LIMIT_MS) {
    return false;
  }
  
  logCache.set(message, now);
  return true;
};

export const logger: Logger = {
  error: (message: string, ...args: unknown[]) => {
    // Always log errors, even in production
    console.error(`🚨 ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (shouldLog(message)) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog(message)) {
      console.log(`🔍 ${message}`, ...args);
    }
  }
};

const CLEANUP_INTERVAL = RATE_LIMIT_MS * 2;

// Cleanup old cache entries periodically
const cleanupLogCache = (): void => {
  const now = Date.now();
  for (const [key, timestamp] of logCache.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      logCache.delete(key);
    }
  }
};

setInterval(cleanupLogCache, CLEANUP_INTERVAL);
