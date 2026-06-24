/**
 * Stale-deploy chunk-load recovery.
 *
 * When a new build is deployed, the SPA shell already in the browser references
 * hashed `/assets/*` chunks by their OLD names. The service worker
 * (`src/sw.ts`) calls `cleanupOutdatedCaches()` on activate, so once the new
 * worker takes over those old chunks can 404. A lazy route import then rejects
 * with a "Failed to fetch dynamically imported module" error and React surfaces
 * a dead error screen ("page failed to load"). The fix is to detect that
 * specific failure and reload once to pull the fresh `index.html` + chunk
 * manifest, guarded so a genuinely broken chunk can't cause a reload loop.
 */

const RELOAD_FLAG_PREFIX = 'equipqr:chunk-reload:';

/** True when the error looks like a dynamic-import / chunk fetch failure. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const name = error instanceof Error ? error.name : '';
  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
}

function safeSessionGet(key: string): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage?.setItem(key, value);
  } catch {
    // sessionStorage unavailable (private mode / quota) — skip the guard.
  }
}

/**
 * Reload the page once per `key` to recover from a stale-deploy chunk 404.
 * Returns true if a reload was triggered, false if a reload was already
 * attempted for this key in the current session (so callers can surface a
 * normal error instead of looping).
 */
export function reloadOnceForChunkError(key: string): boolean {
  const flagKey = `${RELOAD_FLAG_PREFIX}${key}`;
  if (safeSessionGet(flagKey)) return false;
  safeSessionSet(flagKey, String(Date.now()));
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
  return true;
}

/** Clear the per-key reload guard after a successful load. */
export function clearChunkReloadFlag(key: string): void {
  try {
    sessionStorage?.removeItem(`${RELOAD_FLAG_PREFIX}${key}`);
  } catch {
    // best-effort
  }
}
