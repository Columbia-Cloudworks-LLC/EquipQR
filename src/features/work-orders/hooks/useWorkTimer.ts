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
 */
export const useWorkTimer = (workOrderId: string): UseWorkTimerResult => {
  const [isRunning, setIsRunning] = useState(false);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Load initial state from localStorage
  useEffect(() => {
    const savedState = loadState(workOrderId);
    if (savedState) {
      setAccumulatedSeconds(savedState.accumulatedSeconds);
      if (savedState.isRunning) {
        // Resume running timer
        const elapsedSinceStart = Math.floor((Date.now() - savedState.startTime) / 1000);
        startTimeRef.current = savedState.startTime;
        setCurrentSessionSeconds(elapsedSinceStart);
        setIsRunning(true);
      }
    }
  }, [workOrderId]);

  // Tick interval when running
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setCurrentSessionSeconds(elapsed);
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
    if (isRunning && startTimeRef.current) {
      saveState({
        workOrderId,
        startTime: startTimeRef.current,
        accumulatedSeconds,
        isRunning: true,
      });
    } else if (!isRunning && accumulatedSeconds > 0) {
      saveState({
        workOrderId,
        startTime: 0,
        accumulatedSeconds,
        isRunning: false,
      });
    }
  }, [workOrderId, isRunning, accumulatedSeconds]);

  const start = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      setCurrentSessionSeconds(0);
      setIsRunning(true);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (isRunning) {
      // Add current session to accumulated
      const sessionSeconds = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      setAccumulatedSeconds((prev) => prev + sessionSeconds);
      setCurrentSessionSeconds(0);
      startTimeRef.current = null;
      setIsRunning(false);
    }
  }, [isRunning]);

  const stopAndGetHours = useCallback((): number => {
    let totalSeconds = accumulatedSeconds;
    
    if (isRunning && startTimeRef.current) {
      const sessionSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      totalSeconds += sessionSeconds;
    }

    // Clear state
    setIsRunning(false);
    setAccumulatedSeconds(0);
    setCurrentSessionSeconds(0);
    startTimeRef.current = null;
    clearState(workOrderId);

    return secondsToHours(totalSeconds);
  }, [workOrderId, isRunning, accumulatedSeconds]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setAccumulatedSeconds(0);
    setCurrentSessionSeconds(0);
    startTimeRef.current = null;
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
