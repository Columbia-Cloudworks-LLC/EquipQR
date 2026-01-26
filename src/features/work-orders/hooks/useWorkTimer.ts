/**
 * Work Timer Hook
 * 
 * A lightweight timer hook that tracks elapsed time while working on a work order.
 * Uses localStorage for persistence across page refreshes.
 * When stopped, can convert elapsed time into hours for note creation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface WorkTimerState {
  workOrderId: string;
  startTime: number;
  originalStartTime: number; // First start time - used to calculate total elapsed including gaps
  accumulatedSeconds: number;
  isRunning: boolean;
}

interface UseWorkTimerResult {
  /** Total elapsed seconds (including accumulated from previous sessions) */
  elapsedSeconds: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Start or resume the timer */
  start: () => void;
  /** Pause the timer (preserves elapsed time) */
  pause: () => void;
  /** Stop and reset the timer, returning total hours worked */
  stopAndGetHours: () => number;
  /** Reset the timer without returning hours */
  reset: () => void;
  /** Formatted display string (HH:MM:SS) */
  displayTime: string;
}

const STORAGE_KEY_PREFIX = 'eqr_work_timer_';

/** Get storage key for a work order */
const getStorageKey = (workOrderId: string): string => {
  return `${STORAGE_KEY_PREFIX}${workOrderId}`;
};

/** Load timer state from localStorage */
const loadState = (workOrderId: string): WorkTimerState | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(workOrderId));
    if (!stored) return null;
    return JSON.parse(stored) as WorkTimerState;
  } catch {
    return null;
  }
};

/** Save timer state to localStorage */
const saveState = (state: WorkTimerState): void => {
  try {
    localStorage.setItem(getStorageKey(state.workOrderId), JSON.stringify(state));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
};

/** Clear timer state from localStorage */
const clearState = (workOrderId: string): void => {
  try {
    localStorage.removeItem(getStorageKey(workOrderId));
  } catch {
    // Ignore storage errors
  }
};

/** Format seconds as HH:MM:SS */
const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
};

/** Convert seconds to hours (rounded to 2 decimal places) */
const secondsToHours = (seconds: number): number => {
  return Math.round((seconds / 3600) * 100) / 100;
};

/**
 * Hook for tracking time spent working on a work order.
 * Persists to localStorage and can be converted to hours for notes.
 * If workOrderId is undefined or empty, the hook will no-op to prevent state bleeding.
 */
export const useWorkTimer = (workOrderId: string | undefined): UseWorkTimerResult => {
  const [isRunning, setIsRunning] = useState(false);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  // Track the original start time to calculate total elapsed time including gaps
  // When we pause and resume, we adjust this to account for the pause duration
  const originalStartTimeRef = useRef<number | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);

  // Load initial state from localStorage
  useEffect(() => {
    if (!workOrderId) {
      // No-op when workOrderId is empty/undefined to prevent state bleeding
      setIsRunning(false);
      setAccumulatedSeconds(0);
      setCurrentSessionSeconds(0);
      startTimeRef.current = null;
      originalStartTimeRef.current = null;
      pauseStartTimeRef.current = null;
      return;
    }

    const savedState = loadState(workOrderId);
    if (savedState) {
      // Restore original start time from saved state (if available, for backward compatibility)
      if (savedState.originalStartTime) {
        originalStartTimeRef.current = savedState.originalStartTime;
      } else if (savedState.isRunning && savedState.startTime > 0) {
        // Backward compatibility: if originalStartTime not saved, use startTime
        originalStartTimeRef.current = savedState.startTime;
      }
      
      if (savedState.isRunning && savedState.startTime > 0 && originalStartTimeRef.current) {
        // Resume running timer
        const now = Date.now();
        const totalElapsed = Math.floor((now - originalStartTimeRef.current) / 1000);
        const sessionElapsed = Math.floor((now - savedState.startTime) / 1000);
        startTimeRef.current = savedState.startTime;
        setCurrentSessionSeconds(sessionElapsed);
        // Update accumulated to be total minus current session
        setAccumulatedSeconds(Math.max(0, totalElapsed - sessionElapsed));
        setIsRunning(true);
      } else {
        // Saved state exists but timer is not running
        setAccumulatedSeconds(savedState.accumulatedSeconds);
        setCurrentSessionSeconds(0);
        startTimeRef.current = null;
        // Keep originalStartTime if we have it, so resume continues correctly
        if (!savedState.originalStartTime) {
          originalStartTimeRef.current = null;
        }
        pauseStartTimeRef.current = null;
        setIsRunning(false);
      }
    } else {
      // No saved state for this work order; reset timer state so previous work order data doesn't leak
      setIsRunning(false);
      setAccumulatedSeconds(0);
      setCurrentSessionSeconds(0);
      startTimeRef.current = null;
      originalStartTimeRef.current = null;
      pauseStartTimeRef.current = null;
    }
  }, [workOrderId]);

  // Tick interval when running
  useEffect(() => {
    if (isRunning && startTimeRef.current && originalStartTimeRef.current) {
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        // Calculate total elapsed time from original start, including all gaps
        // This gives us wall clock time (total elapsed since first start), not just active work time
        const totalElapsed = Math.floor((now - originalStartTimeRef.current!) / 1000);
        // Current session is the time since the last resume
        const sessionElapsed = Math.floor((now - startTimeRef.current!) / 1000);
        setCurrentSessionSeconds(sessionElapsed);
        // Update accumulated to be total minus current session
        // This ensures accumulatedSeconds + currentSessionSeconds = total elapsed (including gaps)
        setAccumulatedSeconds(totalElapsed - sessionElapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!workOrderId) return; // No-op if no work order ID
    if (isRunning && startTimeRef.current && originalStartTimeRef.current) {
      saveState({
        workOrderId,
        startTime: startTimeRef.current,
        originalStartTime: originalStartTimeRef.current,
        accumulatedSeconds,
        isRunning: true,
      });
    } else if (!isRunning && accumulatedSeconds > 0 && originalStartTimeRef.current) {
      // Save originalStartTime even when paused so we can resume correctly
      saveState({
        workOrderId,
        startTime: 0,
        originalStartTime: originalStartTimeRef.current,
        accumulatedSeconds,
        isRunning: false,
      });
    }
  }, [workOrderId, isRunning, accumulatedSeconds]);

  const start = useCallback(() => {
    if (!workOrderId) return; // No-op if no work order ID
    if (!isRunning) {
      const now = Date.now();
      
      // If this is the first start, set the original start time
      // If resuming from a pause, keep the original start time (don't reset it)
      // This ensures (now - originalStartTime) gives total elapsed time including all gaps
      if (originalStartTimeRef.current === null) {
        // First time starting - set the original start time
        originalStartTimeRef.current = now;
      }
      // If resuming, originalStartTimeRef.current is already set from when we first started
      // or from localStorage, so we don't change it
      
      // Clear pause tracking
      pauseStartTimeRef.current = null;
      
      startTimeRef.current = now;
      setCurrentSessionSeconds(0);
      setIsRunning(true);
    }
  }, [workOrderId, isRunning]);

  const pause = useCallback(() => {
    if (!workOrderId) return; // No-op if no work order ID
    if (isRunning) {
      const now = Date.now();
      // Track when we paused so we can adjust for the gap when resuming
      pauseStartTimeRef.current = now;
      
      // Add current session to accumulated
      const sessionSeconds = Math.floor((now - startTimeRef.current!) / 1000);
      setAccumulatedSeconds((prev) => prev + sessionSeconds);
      setCurrentSessionSeconds(0);
      startTimeRef.current = null;
      setIsRunning(false);
    }
  }, [workOrderId, isRunning]);

  const stopAndGetHours = useCallback((): number => {
    if (!workOrderId) return 0; // No-op if no work order ID
    let totalSeconds = accumulatedSeconds;
    
    if (isRunning && startTimeRef.current && originalStartTimeRef.current) {
      // Calculate total elapsed time from original start
      totalSeconds = Math.floor((Date.now() - originalStartTimeRef.current) / 1000);
    }

    // Clear state
    setIsRunning(false);
    setAccumulatedSeconds(0);
    setCurrentSessionSeconds(0);
    startTimeRef.current = null;
    originalStartTimeRef.current = null;
    pauseStartTimeRef.current = null;
    clearState(workOrderId);

    return secondsToHours(totalSeconds);
  }, [workOrderId, isRunning, accumulatedSeconds]);

  const reset = useCallback(() => {
    if (!workOrderId) return; // No-op if no work order ID
    setIsRunning(false);
    setAccumulatedSeconds(0);
    setCurrentSessionSeconds(0);
    startTimeRef.current = null;
    originalStartTimeRef.current = null;
    pauseStartTimeRef.current = null;
    clearState(workOrderId);
  }, [workOrderId]);

  const elapsedSeconds = accumulatedSeconds + currentSessionSeconds;
  const displayTime = formatTime(elapsedSeconds);

  return {
    elapsedSeconds,
    isRunning,
    start,
    pause,
    stopAndGetHours,
    reset,
    displayTime,
  };
};

export default useWorkTimer;
