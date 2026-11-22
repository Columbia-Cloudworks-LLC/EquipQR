/**
 * Cross-tab guard for offline queue sync.
 *
 * The queue lives in localStorage, which every tab of the app shares. Without
 * a guard, two tabs that come back online together would both replay the same
 * items and create duplicates on the server.
 */

export function offlineSyncLockName(userId: string, orgId: string): string {
  return `equipqr-offline-sync:${userId}:${orgId}`;
}

export type ExclusiveRunResult<T> = { ran: true; value: T } | { ran: false };

/**
 * Run `fn` only if no other tab (or other call in this tab) holds the lock.
 * Browsers without the Web Locks API run `fn` unguarded.
 */
export async function runExclusiveAcrossTabs<T>(
  lockName: string,
  fn: () => Promise<T> | T,
): Promise<ExclusiveRunResult<T>> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return { ran: true, value: await fn() };
  }

  return navigator.locks.request(
    lockName,
    { ifAvailable: true },
    async (lock): Promise<ExclusiveRunResult<T>> => {
      if (!lock) return { ran: false };
      return { ran: true, value: await fn() };
    },
  );
}
