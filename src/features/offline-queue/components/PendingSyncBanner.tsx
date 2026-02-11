/**
 * Pending Sync Banner
 *
 * A persistent alert banner shown at the top of the dashboard when there
 * are offline-queued items pending sync, or when the device is offline.
 *
 * States:
 * - Offline with items  → amber warning with item count
 * - Offline (no items)  → subtle offline indicator
 * - Online with pending → green call-to-action with "Sync Now"
 * - Syncing             → spinner with progress message
 * - Failed items        → red alert with "Retry" option
 *
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/536
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';

export const PendingSyncBanner: React.FC = () => {
  const {
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    syncNow,
    retryFailed,
    clearQueue,
  } = useOfflineQueue();

  const totalActionable = pendingCount + failedCount;

  // Nothing to show — fully synced and online
  if (isOnline && totalActionable === 0 && !isSyncing) {
    return null;
  }

  // ── Syncing state ──────────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <BannerWrapper variant="info">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">Syncing</AlertTitle>
          <AlertDescription className="text-xs">
            Syncing {pendingCount} offline item{pendingCount !== 1 ? 's' : ''}...
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Offline with queued items ──────────────────────────────────────────
  if (!isOnline && totalActionable > 0) {
    return (
      <BannerWrapper variant="warning">
        <WifiOff className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">You are offline</AlertTitle>
          <AlertDescription className="text-xs">
            {totalActionable} item{totalActionable !== 1 ? 's' : ''} saved locally.
            They will sync automatically when your connection returns.
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Offline (no items) ─────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <BannerWrapper variant="muted">
        <WifiOff className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertDescription className="text-xs">
            You are currently offline. Changes will be saved locally.
          </AlertDescription>
        </div>
      </BannerWrapper>
    );
  }

  // ── Failed items ───────────────────────────────────────────────────────
  if (failedCount > 0) {
    return (
      <BannerWrapper variant="destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">Sync issue</AlertTitle>
          <AlertDescription className="text-xs">
            {failedCount} item{failedCount !== 1 ? 's' : ''} failed to sync after retries.
            {pendingCount > 0 && ` ${pendingCount} more pending.`}
          </AlertDescription>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => retryFailed()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearQueue}
          >
            Dismiss
          </Button>
        </div>
      </BannerWrapper>
    );
  }

  // ── Online with pending items ──────────────────────────────────────────
  if (pendingCount > 0) {
    return (
      <BannerWrapper variant="success">
        <Wifi className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">Back online</AlertTitle>
          <AlertDescription className="text-xs">
            {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync.
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={() => syncNow()}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Sync Now
        </Button>
      </BannerWrapper>
    );
  }

  return null;
};

// ─── Styled wrapper ──────────────────────────────────────────────────────────

type BannerVariant = 'info' | 'warning' | 'muted' | 'destructive' | 'success';

const variantStyles: Record<BannerVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100',
  muted: 'border-muted bg-muted/50 text-muted-foreground',
  destructive: 'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/20',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100',
};

const BannerWrapper: React.FC<{
  variant: BannerVariant;
  children: React.ReactNode;
}> = ({ variant, children }) => (
  <Alert
    className={`mx-2 mt-2 mb-0 flex items-center gap-3 py-2.5 px-4 ${variantStyles[variant]}`}
    role="status"
    aria-live="polite"
  >
    {children}
  </Alert>
);
