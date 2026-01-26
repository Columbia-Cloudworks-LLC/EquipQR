/**
 * useOnlineStatus Hook Tests
 * 
 * Tests for online/offline status tracking hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigator: typeof navigator;
  let mockNavigator: {
    onLine: boolean;
  };
  let onlineHandler: (() => void) | null = null;
  let offlineHandler: (() => void) | null = null;

  beforeEach(() => {
    // Store original navigator
    originalNavigator = global.navigator;
    
    // Create mock navigator
    mockNavigator = {
      onLine: true,
    };
    
    // Replace navigator with mock
    Object.defineProperty(global, 'navigator', {
      writable: true,
      configurable: true,
      value: mockNavigator,
    });

    // Capture event handlers when they're registered
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'online' && typeof handler === 'function') {
        onlineHandler = handler as () => void;
      } else if (event === 'offline' && typeof handler === 'function') {
        offlineHandler = handler as () => void;
      }
    });

    vi.spyOn(window, 'removeEventListener');
    
    // Reset handlers
    onlineHandler = null;
    offlineHandler = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    
    // Reset handlers
    onlineHandler = null;
    offlineHandler = null;
    
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      writable: true,
      configurable: true,
      value: originalNavigator,
    });
  });

  it('should initialize with navigator.onLine value when online', () => {
    mockNavigator.onLine = true;

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should initialize with navigator.onLine value when offline', () => {
    mockNavigator.onLine = false;

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should default to true when navigator is undefined (SSR)', () => {
    // Temporarily remove navigator
    Object.defineProperty(global, 'navigator', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should register online and offline event listeners', () => {
    renderHook(() => useOnlineStatus());

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should unregister event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should transition to online and syncing when online event fires', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = false;

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSyncing).toBe(false);

    // Simulate going online
    act(() => {
      mockNavigator.onLine = true;
      onlineHandler?.();
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(true);

    // Fast-forward 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('should clear syncing state when going offline', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = true;

    const { result } = renderHook(() => useOnlineStatus());

    // First go online and start syncing
    act(() => {
      onlineHandler?.();
    });

    expect(result.current.isSyncing).toBe(true);

    // Then go offline
    act(() => {
      mockNavigator.onLine = false;
      offlineHandler?.();
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should clear timeout when going offline during syncing', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = true;

    const { result } = renderHook(() => useOnlineStatus());

    // Go online to start syncing
    act(() => {
      onlineHandler?.();
    });

    expect(result.current.isSyncing).toBe(true);

    // Go offline before timeout completes
    act(() => {
      mockNavigator.onLine = false;
      offlineHandler?.();
    });

    // Fast-forward past the timeout - syncing should remain false
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('should trigger sync when online', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = true;

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isSyncing).toBe(false);

    act(() => {
      result.current.triggerSync();
    });

    expect(result.current.isSyncing).toBe(true);

    // Fast-forward 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('should not trigger sync when offline', () => {
    mockNavigator.onLine = false;

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isSyncing).toBe(false);

    act(() => {
      result.current.triggerSync();
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('should clear existing timeout when triggerSync is called multiple times', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = true;

    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      result.current.triggerSync();
    });

    expect(result.current.isSyncing).toBe(true);

    // Call triggerSync again before timeout completes (this should clear the first timeout)
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.triggerSync();
    });

    // Verify syncing is still true after second call
    expect(result.current.isSyncing).toBe(true);

    // Fast-forward 2 seconds from the second call
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it('should clear timeout on unmount', () => {
    vi.useFakeTimers();
    mockNavigator.onLine = true;

    const { result, unmount } = renderHook(() => useOnlineStatus());

    act(() => {
      result.current.triggerSync();
    });

    expect(result.current.isSyncing).toBe(true);

    // Unmount before timeout completes
    unmount();

    // Fast-forward past the timeout - should not cause issues
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // No assertions needed - just ensuring no errors occur
  });
});
