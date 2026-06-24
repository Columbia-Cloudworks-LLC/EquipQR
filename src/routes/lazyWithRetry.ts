import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reloadOnceForChunkError, clearChunkReloadFlag } from '@/utils/chunkLoadError';

/**
 * `React.lazy` wrapper that survives stale-deploy chunk 404s.
 *
 * On a dynamic-import failure caused by a chunk-load error, retry once (handles
 * transient network blips) and, if it still fails, trigger a one-time guarded
 * hard reload so the browser fetches the fresh shell. Non-chunk errors are
 * rethrown unchanged so real bugs still surface in the error boundary.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  chunkId: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory();
      clearChunkReloadFlag(chunkId);
      return module;
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;

      try {
        const module = await factory();
        clearChunkReloadFlag(chunkId);
        return module;
      } catch (retryError) {
        if (!isChunkLoadError(retryError)) throw retryError;
        if (reloadOnceForChunkError(chunkId)) {
          // Keep Suspense mounted until the reload navigates away.
          return new Promise<{ default: T }>(() => {});
        }
        throw retryError;
      }
    }
  });
}
