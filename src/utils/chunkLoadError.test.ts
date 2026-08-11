import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isChunkLoadError,
  reloadOnceForChunkError,
  clearChunkReloadFlag,
} from './chunkLoadError';

describe('isChunkLoadError', () => {
  it('detects Vite dynamic import failures', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/Equipment-abc.js')),
    ).toBe(true);
  });

  it('detects webpack-style ChunkLoadError by name', () => {
    const err = new Error('Loading chunk 42 failed');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isChunkLoadError(new Error('permission denied'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('reloadOnceForChunkError', () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reloadSpy = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('reloads once for a given key, then refuses to loop', () => {
    expect(reloadOnceForChunkError('route-x')).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Second call for the same key is suppressed (no reload loop).
    expect(reloadOnceForChunkError('route-x')).toBe(false);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads again after the guard is cleared (successful load)', () => {
    expect(reloadOnceForChunkError('route-y')).toBe(true);
    clearChunkReloadFlag('route-y');
    expect(reloadOnceForChunkError('route-y')).toBe(true);
    expect(reloadSpy).toHaveBeenCalledTimes(2);
  });
});
