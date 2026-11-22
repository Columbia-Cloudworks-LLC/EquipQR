import { afterEach, describe, expect, it, vi } from 'vitest';
import { offlineSyncLockName, runExclusiveAcrossTabs } from './offlineQueueLock';

type LockCallback = (lock: object | null) => Promise<unknown>;

function stubLocks(available: boolean) {
  const request = vi.fn((_name: string, _options: object, callback: LockCallback) =>
    callback(available ? {} : null),
  );
  vi.stubGlobal('navigator', { ...navigator, locks: { request } });
  return request;
}

describe('runExclusiveAcrossTabs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scopes the lock name to the user and organization', () => {
    expect(offlineSyncLockName('user-1', 'org-1')).not.toBe(offlineSyncLockName('user-1', 'org-2'));
  });

  it('runs the task when the lock is free', async () => {
    const request = stubLocks(true);

    const result = await runExclusiveAcrossTabs('lock-a', async () => 'done');

    expect(result).toEqual({ ran: true, value: 'done' });
    expect(request).toHaveBeenCalledWith('lock-a', { ifAvailable: true }, expect.any(Function));
  });

  it('skips the task when another tab holds the lock', async () => {
    stubLocks(false);
    const task = vi.fn(async () => 'done');

    const result = await runExclusiveAcrossTabs('lock-a', task);

    expect(result).toEqual({ ran: false });
    expect(task).not.toHaveBeenCalled();
  });

  it('runs the task unguarded where the Web Locks API is missing', async () => {
    vi.stubGlobal('navigator', { onLine: true });

    const result = await runExclusiveAcrossTabs('lock-a', async () => 42);

    expect(result).toEqual({ ran: true, value: 42 });
  });
});
