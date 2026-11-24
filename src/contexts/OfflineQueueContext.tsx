/**
 * Offline Queue Context
 *
 * Provides reactive access to the OfflineQueueService and automatically
 * triggers sync when the device comes back online.
 *
 * Must be mounted inside AuthProvider + SimpleOrganizationProvider because
 * it needs user id and organization id to scope the localStorage key.
 *
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/536
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SessionContext } from '@/contexts/SessionContext';
import {
  OFFLINE_QUEUE_CHANGED_EVENT,
  OfflineQueueService,
  type OfflineQueueItem,
  type OfflineQueueEnqueueInput,
} from '@/services/offlineQueueService';
import { OfflineQueueProcessor, type ProcessResult } from '@/services/offlineQueueProcessor';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { requestOfflineDataRefresh } from '@/features/offline-queue/hooks/useOfflineEquipmentDownload';
import { offlineSyncLockName, runExclusiveAcrossTabs } from '@/services/offlineQueueLock';

/** Delay before auto-sync when the last run made progress (lets the network settle). */
const AUTO_SYNC_DELAY_MS = 1500;
const AUTO_SYNC_BACKOFF_BASE_MS = 5000;
const AUTO_SYNC_BACKOFF_MAX_MS = 60_000;

/** Wait longer after each consecutive run that synced nothing (weak signal, server trouble). */
function autoSyncDelayMs(stalledRuns: number): number {
  if (stalledRuns === 0) return AUTO_SYNC_DELAY_MS;
  return Math.min(AUTO_SYNC_BACKOFF_MAX_MS, AUTO_SYNC_BACKOFF_BASE_MS * 2 ** (stalledRuns - 1));
}

// ─── Context value ───────────────────────────────────────────────────────────

interface OfflineQueueContextValue {
  /** All items in the queue (any status). */
  queuedItems: OfflineQueueItem[];
  /** Number of items waiting to be synced (status === 'pending'). */
  pendingCount: number;
  /** Number of items that exhausted retries. */
  failedCount: number;
  /** Whether the browser reports as online. */
  isOnline: boolean;
  /** Whether a sync operation is currently in progress. */
  isSyncing: boolean;
  /** Enqueue a new item (called from mutation hooks on network error). */
  enqueue: (input: OfflineQueueEnqueueInput) => OfflineQueueItem | null;
  /** Manually trigger sync of all pending items. */
  syncNow: () => Promise<ProcessResult | null>;
  /** Remove a single item from the queue. */
  removeItem: (id: string) => void;
  /** Clear the entire queue. */
  clearQueue: () => void;
  /** Reset all failed items back to pending and retry. */
  retryFailed: () => Promise<ProcessResult | null>;
  /** Re-read the queue from localStorage (call after external writes). */
  refresh: () => void;
  /** The underlying OfflineQueueService instance (for OfflineAwareService). */
  queueServiceInstance: OfflineQueueService | null;
}

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

/** Dashboard provider: the queue belongs to the organization that is open. */
export const OfflineQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrganization } = useOrganization();
  return (
    <OfflineQueueProviderForOrganization organizationId={currentOrganization?.id ?? null}>
      {children}
    </OfflineQueueProviderForOrganization>
  );
};

/**
 * The queue and its sync loop for one organization. Used directly by pages
 * that have no organization provider (the QR scan page), so changes saved
 * there with no signal are synced from that page too, not only after the
 * technician happens to open the dashboard.
 */
export const OfflineQueueProviderForOrganization: React.FC<{
  organizationId: string | null;
  children: React.ReactNode;
}> = ({ organizationId, children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isOnline = useBrowserOnline();
  const [isSyncing, setIsSyncing] = useState(false);
  // Bump this to force re-reads from localStorage after mutations
  const [revision, setRevision] = useState(0);
  const syncLockRef = useRef(false);
  // Read without requiring the provider (it is absent in isolated renders).
  const refreshSession = useContext(SessionContext)?.refreshSession;
  const refreshSessionRef = useRef(refreshSession);
  refreshSessionRef.current = refreshSession;
  const bootSyncAttemptedRef = useRef(false);
  // Consecutive sync runs that synced nothing — drives auto-sync backoff.
  const stalledRunsRef = useRef(0);

  // Stable service & processor instances (re-created when user/org changes)
  const queueService = useMemo(() => {
    if (!user?.id || !organizationId) return null;
    return new OfflineQueueService(user.id, organizationId);
  }, [user?.id, organizationId]);

  const processor = useMemo(() => {
    if (!queueService) return null;
    return new OfflineQueueProcessor(queueService, queryClient);
  }, [queueService, queryClient]);

  const syncLockName = useMemo(() => {
    if (!user?.id || !organizationId) return null;
    return offlineSyncLockName(user.id, organizationId);
  }, [user?.id, organizationId]);

  // Derived state from localStorage
  const queuedItems = useMemo(() => {
    // revision is a dependency so we re-read after writes
    void revision;
    return queueService?.getAll() ?? [];
  }, [queueService, revision]);

  const pendingCount = useMemo(
    () => queuedItems.filter(i => i.status === 'pending').length,
    [queuedItems],
  );
  const failedCount = useMemo(
    () => queuedItems.filter(i => i.status === 'failed').length,
    [queuedItems],
  );

  // Bump revision to trigger state recalculation
  const refresh = useCallback(() => setRevision(r => r + 1), []);

  // Anything that writes the queue through its own service instance (the
  // offline-aware services, the QR scan page) announces it, so the pending
  // count and auto-sync react without each caller having to call refresh().
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChanged = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 250);
    };
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, onChanged);
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  // ── Auto-sync when coming back online ──────────────────────────────────

  const syncNow = useCallback(async (): Promise<ProcessResult | null> => {
    if (!processor || !syncLockName || syncLockRef.current) return null;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const hasQueuedTeam = () => queueService?.getAll().some(item => item.type === 'team_create') ?? false;
      const teamWasQueued = hasQueuedTeam();
      const run = await runExclusiveAcrossTabs(syncLockName, () => processor.processAll());
      refresh();
      // A team created offline makes its creator a manager. Team memberships
      // live in the session, so reload it once the team is on the server, or
      // the new team stays out of the team switcher until the next sign-in.
      if (run.ran && teamWasQueued && !hasQueuedTeam()) {
        void refreshSessionRef.current?.(true)?.catch((error: unknown) =>
          logger.error('Team synced but session refresh failed; team switcher may be stale', error),
        );
      }
      if (!run.ran) {
        // Another tab is already syncing this queue; check back later.
        stalledRunsRef.current += 1;
        return null;
      }
      const result = run.value;
      stalledRunsRef.current = result.succeeded > 0 ? 0 : stalledRunsRef.current + 1;

      if (result.succeeded > 0) {
        const conflictNote = result.conflicts && result.conflicts.length > 0
          ? ` (${result.conflicts.length} with conflicts resolved)`
          : '';
        const remainingNote = result.remaining > 0 ? `, ${result.remaining} still to sync` : '';
        toast.success(`Synced ${result.succeeded} offline item${result.succeeded > 1 ? 's' : ''}${conflictNote}${remainingNote}`);
        // Once everything is on the server, save a fresh copy for the next
        // time the signal drops (the old copy predates these changes).
        if (result.remaining === 0 && user?.id && organizationId) {
          requestOfflineDataRefresh(user.id, organizationId);
        }
      }
      if (result.conflicts && result.conflicts.length > 0) {
        for (const conflict of result.conflicts) {
          toast.warning('Sync conflict resolved', { description: conflict.details });
        }
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} item${result.failed > 1 ? 's' : ''} failed to sync`);
      }

      return result;
    } catch (error) {
      logger.error('Offline queue sync error', error);
      stalledRunsRef.current += 1;
      toast.error('Sync failed', { description: 'Please try again.' });
      return null;
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [processor, syncLockName, refresh, user?.id, organizationId, queueService]);

  // A fresh connection (or a different queue) deserves an immediate attempt.
  useEffect(() => {
    stalledRunsRef.current = 0;
  }, [isOnline, processor]);

  // Items left `processing` by a closed tab or crash would never sync and are
  // not counted as pending, so put them back before anything reads the queue.
  // Skipped while a sync holds the lock: those items are genuinely in flight.
  useEffect(() => {
    if (!queueService || !syncLockName) return;
    let cancelled = false;
    runExclusiveAcrossTabs(syncLockName, () => queueService.recoverInterrupted())
      .then(run => {
        if (!cancelled && run.ran && run.value > 0) refresh();
      })
      .catch(error => logger.error('Failed to recover interrupted offline items', error));
    return () => {
      cancelled = true;
    };
  }, [queueService, syncLockName, refresh]);

  // Trigger auto-sync when we come back online and have pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      // Short delay to let the network stabilize; longer after runs that
      // synced nothing so a weak signal is not hammered.
      const timer = setTimeout(() => {
        syncNow();
      }, autoSyncDelayMs(stalledRunsRef.current));
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  // Drain pending queue on app boot while online (tab reopen scenario)
  useEffect(() => {
    if (pendingCount === 0) {
      bootSyncAttemptedRef.current = false;
    }
  }, [pendingCount]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || isSyncing || !processor) return;
    if (bootSyncAttemptedRef.current) return;
    bootSyncAttemptedRef.current = true;
    const timer = setTimeout(() => {
      syncNow();
    }, 2000);
    return () => clearTimeout(timer);
  }, [processor, isOnline, pendingCount, isSyncing, syncNow]);

  // ── Enqueue ────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (input: OfflineQueueEnqueueInput): OfflineQueueItem | null => {
      if (!queueService) {
        logger.error('Cannot enqueue: offline queue service not initialized');
        return null;
      }
      try {
        const item = queueService.enqueue(input);
        refresh();
        return item;
      } catch (error) {
        // OfflineQueuePayloadError is already toasted by the service
        logger.error('Failed to enqueue offline item', error);
        return null;
      }
    },
    [queueService, refresh],
  );

  // ── Remove / Clear ─────────────────────────────────────────────────────

  const removeItem = useCallback(
    (id: string) => {
      queueService?.remove(id);
      refresh();
    },
    [queueService, refresh],
  );

  const clearQueue = useCallback(() => {
    queueService?.clear();
    refresh();
  }, [queueService, refresh]);

  const retryFailed = useCallback(async (): Promise<ProcessResult | null> => {
    queueService?.retryFailedItems();
    refresh();
    return syncNow();
  }, [queueService, refresh, syncNow]);

  // ── Value ──────────────────────────────────────────────────────────────

  const value = useMemo<OfflineQueueContextValue>(
    () => ({
      queuedItems,
      pendingCount,
      failedCount,
      isOnline,
      isSyncing,
      enqueue,
      syncNow,
      removeItem,
      clearQueue,
      retryFailed,
      refresh,
      queueServiceInstance: queueService,
    }),
    [queuedItems, pendingCount, failedCount, isOnline, isSyncing, enqueue, syncNow, removeItem, clearQueue, retryFailed, refresh, queueService],
  );

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const useOfflineQueue = (): OfflineQueueContextValue => {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider');
  }
  return ctx;
};

/**
 * Returns the offline queue context if available, or null if the provider
 * is not mounted. Safe for use in hooks that may run outside the dashboard.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useOfflineQueueOptional = (): OfflineQueueContextValue | null => {
  return useContext(OfflineQueueContext);
};
