/**
 * Online Status Hook
 * 
 * Tracks browser online/offline status using the navigator.onLine API.
 * Useful for showing offline indicators and managing offline-first UX.
 */

import { useState, useEffect, useCallback } from 'react';

interface UseOnlineStatusResult {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether we're currently trying to sync data */
  isSyncing: boolean;
  /** Trigger a sync attempt (sets syncing state briefly) */
  triggerSync: () => void;
}

/**
 * Hook for tracking browser online/offline status.
 * Returns the current online state and a syncing indicator.
 */
export const useOnlineStatus = (): UseOnlineStatusResult => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Brief syncing state when coming back online
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = useCallback(() => {
    if (isOnline) {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    }
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    triggerSync,
  };
};

export default useOnlineStatus;
