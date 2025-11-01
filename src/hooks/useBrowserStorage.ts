import { useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface UseBrowserStorageOptions<T> {
  key: string;
  data: T;
  enabled?: boolean;
}

export const useBrowserStorage = <T>({ key, data, enabled = true }: UseBrowserStorageOptions<T>) => {
  // Save to localStorage
  const saveToStorage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.warn('Failed to save to localStorage', error);
    }
  }, [key, data, enabled]);

  // Load from localStorage
  const loadFromStorage = useCallback((): T | null => {
    if (!enabled || typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if data is less than 24 hours old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (error) {
      logger.warn('Failed to load from localStorage', error);
    }
    
    return null;
  }, [key, enabled]);

  // Clear storage
  const clearStorage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.warn('Failed to clear localStorage', error);
    }
  }, [key, enabled]);

  // Optimized auto-save with longer delay to reduce thrashing
  useEffect(() => {
    if (!enabled) return;
    
    const timeoutId = setTimeout(saveToStorage, 5000); // Increased from 1s to 5s
    return () => clearTimeout(timeoutId);
  }, [saveToStorage, enabled]);

  return { saveToStorage, loadFromStorage, clearStorage };
};