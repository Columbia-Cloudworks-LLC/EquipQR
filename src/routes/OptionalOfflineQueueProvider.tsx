import type { ReactNode } from 'react';
import { OfflineQueueProvider } from '@/contexts/OfflineQueueContext';
import { OFFLINE_QUEUE_ENABLED } from '@/lib/flags';

/**
 * Conditionally wraps children in OfflineQueueProvider when the OFFLINE_QUEUE
 * feature flag is enabled. This keeps the provider and its IndexedDB/SW
 * initialisation entirely out of the bundle path when the flag is off.
 */
export const OptionalOfflineQueueProvider = ({ children }: { children: ReactNode }) => {
  if (!OFFLINE_QUEUE_ENABLED) return <>{children}</>;
  return <OfflineQueueProvider>{children}</OfflineQueueProvider>;
};
