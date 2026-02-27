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
import { OfflineQueueService, type OfflineQueueItem, type OfflineQueueEnqueueInput } from '@/services/offlineQueueService';
import { OfflineQueueProcessor, type ProcessResult } from '@/services/offlineQueueProcessor';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

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

export const OfflineQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  // Bump this to force re-reads from localStorage after mutations
  const [revision, setRevision] = useState(0);
  const syncLockRef = useRef(false);

  // Stable service & processor instances (re-created when user/org changes)
  const queueService = useMemo(() => {
    if (!user?.id || !currentOrganization?.id) return null;
    return new OfflineQueueService(user.id, currentOrganization.id);
  }, [user?.id, currentOrganization?.id]);

  const processor = useMemo(() => {
    if (!queueService) return null;
    return new OfflineQueueProcessor(queueService, queryClient);
  }, [queueService, queryClient]);

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

  // ── Online / offline listeners ─────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Auto-sync when coming back online ──────────────────────────────────

  const syncNow = useCallback(async (): Promise<ProcessResult | null> => {
    if (!processor || syncLockRef.current) return null;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const result = await processor.processAll();
      refresh();

      if (result.succeeded > 0) {
        const conflictNote = result.conflicts && result.conflicts.length > 0
          ? ` (${result.conflicts.length} with conflicts resolved)`
          : '';
        toast.success(`Synced ${result.succeeded} offline item${result.succeeded > 1 ? 's' : ''}${conflictNote}`);
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
      toast.error('Sync failed', { description: 'Please try again.' });
      return null;
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [processor, refresh]);

  // Trigger auto-sync when we come back online and have pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      // Small delay to let the network stabilize
      const timer = setTimeout(() => {
        syncNow();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

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
export const useOfflineQueueOptional = (): OfflineQueueContextValue | null => {
  return useContext(OfflineQueueContext);
};
