import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAttachedNoteImages } from './useAttachedNoteImages';

describe('useAttachedNoteImages', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
  });

  it('appends files when online', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const { result } = renderHook(() => useAttachedNoteImages());
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    act(() => {
      result.current.handleImagesAdd([file]);
    });

    expect(result.current.attachedImages).toEqual([file]);
  });

  it('calls onAddWhileOffline and skips attach when offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const onAddWhileOffline = vi.fn();
    const { result } = renderHook(() => useAttachedNoteImages({ onAddWhileOffline }));
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    act(() => {
      result.current.handleImagesAdd([file]);
    });

    expect(onAddWhileOffline).toHaveBeenCalledTimes(1);
    expect(result.current.attachedImages).toEqual([]);
  });
});
