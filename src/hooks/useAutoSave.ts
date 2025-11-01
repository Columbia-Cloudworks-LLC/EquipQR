import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/utils/logger';

type SaveTrigger = 'text' | 'selection' | 'manual';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  textDelay?: number;
  selectionDelay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ 
  onSave, 
  textDelay = 8000, 
  selectionDelay = 1000, 
  enabled = true 
}: UseAutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const saveRequestRef = useRef<Promise<void>>();
  const lastSaveDataRef = useRef<string>('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date>();

  const triggerAutoSave = useCallback((trigger: SaveTrigger = 'text', currentData?: string) => {
    if (!enabled) return;

    // Smart change detection - don't save if data hasn't changed
    if (currentData && currentData === lastSaveDataRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Use different delays based on trigger type
    const delay = trigger === 'text' ? textDelay : selectionDelay;

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        // Prevent multiple simultaneous saves
        if (saveRequestRef.current) {
          await saveRequestRef.current;
          return;
        }

        setStatus('saving');
        saveRequestRef.current = onSave();
        await saveRequestRef.current;
        
        // Update tracking data
        if (currentData) {
          lastSaveDataRef.current = currentData;
        }
        
        setStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        setStatus('error');
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Auto-save failed', error);
        }
      } finally {
        saveRequestRef.current = undefined;
      }
    }, delay);
  }, [onSave, textDelay, selectionDelay, enabled]);

  const cancelAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAutoSave();
    };
  }, [cancelAutoSave]);

  return { triggerAutoSave, cancelAutoSave, status, lastSaved };
};