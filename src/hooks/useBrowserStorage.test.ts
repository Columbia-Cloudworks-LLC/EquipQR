/**
 * useBrowserStorage Hook Tests
 *
 * Target file: src/hooks/useBrowserStorage.ts
 *
 * Scenarios covered:
 * saveToStorage:
 *   - saves data to localStorage as JSON with a timestamp
 *   - does nothing when enabled is false
 *   - calls logger.warn when localStorage.setItem throws
 *
 * loadFromStorage:
 *   - returns stored data when it is within the 24-hour window
 *   - returns null when no data is stored under the key
 *   - returns null when stored data is older than 24 hours
 *   - returns null when enabled is false
 *   - returns null when stored JSON is malformed
 *   - returns null when stored timestamp is exactly at the 24h boundary
 *
 * clearStorage:
 *   - removes the key from localStorage
 *   - does nothing when enabled is false
 *   - calls logger.warn when localStorage.removeItem throws
 *
 * auto-save useEffect:
 *   - schedules saveToStorage after the 5000 ms delay
 *   - does not auto-save when enabled is false
 *   - cancels the pending timer on unmount (no save after unmount)
 *   - resets the timer when data changes and saves the new value
 *
 * Intentionally deferred:
 *   - The `typeof window === 'undefined'` guard path is unreachable in the jsdom
 *     test environment and does not contribute to coverable branches there.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBrowserStorage } from './useBrowserStorage';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the mocked logger so we can assert on it.
import { logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_KEY = 'useBrowserStorage-test-key';

interface SampleData {
  name: string;
  value: number;
}

const SAMPLE_DATA: SampleData = { name: 'Test', value: 42 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBrowserStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(logger.warn).mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // saveToStorage
  // -------------------------------------------------------------------------

  describe('saveToStorage', () => {
    it('saves data to localStorage as JSON with a timestamp', () => {
      const now = 1_700_000_000_000;
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      act(() => {
        result.current.saveToStorage();
      });

      const raw = localStorage.getItem(TEST_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual(SAMPLE_DATA);
      expect(parsed.timestamp).toBe(now);
    });

    it('does nothing when enabled is false', () => {
      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA, enabled: false })
      );

      act(() => {
        result.current.saveToStorage();
      });

      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('calls logger.warn when localStorage.setItem throws', () => {
      const error = new Error('QuotaExceededError');
      // jsdom's localStorage delegates to Storage.prototype, so spy there.
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      act(() => {
        result.current.saveToStorage();
      });

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'Failed to save to localStorage',
        error
      );
    });
  });

  // -------------------------------------------------------------------------
  // loadFromStorage
  // -------------------------------------------------------------------------

  describe('loadFromStorage', () => {
    it('returns stored data when it is within the 24-hour window', () => {
      const now = Date.now();
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: now - 1_000 }) // 1 second ago
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(result.current.loadFromStorage()).toEqual(SAMPLE_DATA);
    });

    it('returns null when no data is stored under the key', () => {
      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(result.current.loadFromStorage()).toBeNull();
    });

    it('returns null when stored data is older than 24 hours', () => {
      const expired = Date.now() - 25 * 60 * 60 * 1_000; // 25 hours ago
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: expired })
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(result.current.loadFromStorage()).toBeNull();
    });

    it('returns null when stored timestamp is exactly at the 24h boundary', () => {
      // Timestamp exactly 24h old is NOT less than 24h, so it should return null.
      const boundary = Date.now() - 24 * 60 * 60 * 1_000;
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: boundary })
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(result.current.loadFromStorage()).toBeNull();
    });

    it('returns null when enabled is false', () => {
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: Date.now() })
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA, enabled: false })
      );

      expect(result.current.loadFromStorage()).toBeNull();
    });

    it('returns null when stored JSON is malformed and calls logger.warn', () => {
      localStorage.setItem(TEST_KEY, 'not-valid-json{{{{');

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(result.current.loadFromStorage()).toBeNull();
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'Failed to load from localStorage',
        expect.any(Error)
      );
    });
  });

  // -------------------------------------------------------------------------
  // clearStorage
  // -------------------------------------------------------------------------

  describe('clearStorage', () => {
    it('removes the key from localStorage', () => {
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: Date.now() })
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      act(() => {
        result.current.clearStorage();
      });

      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('does nothing when enabled is false', () => {
      localStorage.setItem(
        TEST_KEY,
        JSON.stringify({ data: SAMPLE_DATA, timestamp: Date.now() })
      );

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA, enabled: false })
      );

      act(() => {
        result.current.clearStorage();
      });

      expect(localStorage.getItem(TEST_KEY)).not.toBeNull();
    });

    it('calls logger.warn when localStorage.removeItem throws', () => {
      const error = new Error('SecurityError');
      // jsdom's localStorage delegates to Storage.prototype, so spy there.
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      act(() => {
        result.current.clearStorage();
      });

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        'Failed to clear localStorage',
        error
      );
    });
  });

  // -------------------------------------------------------------------------
  // auto-save useEffect
  // -------------------------------------------------------------------------

  describe('auto-save useEffect', () => {
    it('schedules saveToStorage after the 5000 ms delay', () => {
      renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      expect(localStorage.getItem(TEST_KEY)).toBeNull();

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      const raw = localStorage.getItem(TEST_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).data).toEqual(SAMPLE_DATA);
    });

    it('does not auto-save before the 5000 ms delay elapses', () => {
      renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      act(() => {
        vi.advanceTimersByTime(4_999);
      });

      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('does not auto-save when enabled is false', () => {
      renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA, enabled: false })
      );

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('cancels the pending timer on unmount so no save occurs', () => {
      const { unmount } = renderHook(() =>
        useBrowserStorage({ key: TEST_KEY, data: SAMPLE_DATA })
      );

      unmount();

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(localStorage.getItem(TEST_KEY)).toBeNull();
    });

    it('resets the auto-save timer when data changes and saves the new value', () => {
      const { rerender } = renderHook(
        ({ data }: { data: SampleData }) =>
          useBrowserStorage({ key: TEST_KEY, data }),
        { initialProps: { data: SAMPLE_DATA } }
      );

      // Advance partway through the initial 5 s delay.
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(localStorage.getItem(TEST_KEY)).toBeNull();

      // Change data — should restart the 5 s timer.
      const UPDATED_DATA: SampleData = { name: 'Updated', value: 99 };
      rerender({ data: UPDATED_DATA });

      // 3 s after the re-render: timer still running (needs 5 s from last render).
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(localStorage.getItem(TEST_KEY)).toBeNull();

      // 5 s after the re-render: timer fires.
      act(() => {
        vi.advanceTimersByTime(2_000);
      });

      const raw = localStorage.getItem(TEST_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).data).toEqual(UPDATED_DATA);
    });
  });
});
