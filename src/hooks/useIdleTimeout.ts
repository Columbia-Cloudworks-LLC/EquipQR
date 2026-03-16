import { useCallback, useEffect, useRef, useState } from 'react';

interface UseIdleTimeoutOptions {
  enabled: boolean;
  timeoutMs?: number;
  warningMs?: number;
  onTimeout: () => Promise<void> | void;
}

interface UseIdleTimeoutResult {
  isWarningOpen: boolean;
  secondsRemaining: number;
  staySignedIn: () => void;
  signOutNow: () => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_WARNING_MS = 2 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 1000;

export function useIdleTimeout({
  enabled,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  onTimeout,
}: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(warningMs / 1000));

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(0);
  const timeoutAtRef = useRef<number | null>(null);
  const hasTimedOutRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    if (hasTimedOutRef.current) return;
    hasTimedOutRef.current = true;
    clearTimers();
    setIsWarningOpen(false);
    await onTimeout();
  }, [clearTimers, onTimeout]);

  const startCountdown = useCallback(() => {
    if (!timeoutAtRef.current) return;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const tick = () => {
      const timeoutAt = timeoutAtRef.current;
      if (!timeoutAt) return;
      const remainingMs = Math.max(0, timeoutAt - Date.now());
      setSecondsRemaining(Math.ceil(remainingMs / 1000));
    };

    tick();
    countdownIntervalRef.current = setInterval(tick, 1000);
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    hasTimedOutRef.current = false;
    setIsWarningOpen(false);
    setSecondsRemaining(Math.floor(warningMs / 1000));

    timeoutAtRef.current = Date.now() + timeoutMs;

    warningTimerRef.current = setTimeout(() => {
      setIsWarningOpen(true);
      startCountdown();
    }, Math.max(0, timeoutMs - warningMs));

    timeoutTimerRef.current = setTimeout(() => {
      void handleTimeout();
    }, timeoutMs);
  }, [clearTimers, handleTimeout, startCountdown, timeoutMs, warningMs]);

  const registerActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityRef.current = now;
    if (!enabled) return;
    scheduleTimers();
  }, [enabled, scheduleTimers]);

  const staySignedIn = useCallback(() => {
    if (!enabled) return;
    scheduleTimers();
  }, [enabled, scheduleTimers]);

  const signOutNow = useCallback(async () => {
    await handleTimeout();
  }, [handleTimeout]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setIsWarningOpen(false);
      return;
    }

    const eventOptions: AddEventListenerOptions = { passive: true };
    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registerActivity();
      }
    };

    events.forEach((eventName) => window.addEventListener(eventName, registerActivity, eventOptions));
    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleTimers();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, registerActivity, eventOptions));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimers();
    };
  }, [clearTimers, enabled, registerActivity, scheduleTimers]);

  return {
    isWarningOpen,
    secondsRemaining,
    staySignedIn,
    signOutNow,
  };
}
