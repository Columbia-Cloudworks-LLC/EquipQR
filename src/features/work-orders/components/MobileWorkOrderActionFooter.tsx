/**
 * Mobile sync/offline banner for work-order details (only when relevant).
 * Status and field actions live in page content and the quick-actions drawer.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import type { MobileFooterSyncState } from '@/features/work-orders/utils/workOrderDetailsViewModel';

export type FooterWorkOrder = {
  id: string;
  status:
    | 'submitted'
    | 'accepted'
    | 'assigned'
    | 'in_progress'
    | 'on_hold'
    | 'completed'
    | 'cancelled';
  assignee_id?: string | null;
  created_by?: string | null;
};

export interface MobileWorkOrderActionFooterProps {
  workOrder: FooterWorkOrder;
  organizationId: string;
  /** Queue + browser online from OfflineQueueContext */
  syncState: MobileFooterSyncState;
  onRetrySync?: () => void;
}

function footerQueueMessage(sync: MobileFooterSyncState): { className: string; content: React.ReactNode } | null {
  if (sync.failedCount > 0) {
    return {
      className: 'bg-destructive/15 text-destructive',
      content: (
        <>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          <span>Sync failed</span>
        </>
      ),
    };
  }
  if (sync.isSyncing) {
    return {
      className: 'bg-info/20 text-info dark:bg-info/20 dark:text-info',
      content: (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span>Syncing...</span>
        </>
      ),
    };
  }
  if (sync.pendingCount > 0) {
    return {
      className: 'bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning',
      content: (
        <>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          <span>Sync pending</span>
        </>
      ),
    };
  }
  if (!sync.isOnline) {
    return {
      className: 'bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning',
      content: (
        <>
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          <span>Offline - text and status changes save locally</span>
        </>
      ),
    };
  }
  return null;
}

export const MobileWorkOrderActionFooter: React.FC<MobileWorkOrderActionFooterProps> = ({
  workOrder,
  organizationId,
  syncState,
  onRetrySync,
}) => {
  const { user } = useAuth();
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();

  const canPerformWorkflow = () => {
    if (isManager) return true;
    if (isTechnician && workOrder.assignee_id === user?.id) return true;
    return !!(workOrder.created_by === user?.id && workOrder.status === 'submitted');
  };

  if (!organizationId || !canPerformWorkflow()) {
    return null;
  }

  const queueRow = footerQueueMessage(syncState);
  if (!queueRow) {
    return null;
  }

  return (
    <div className="fixed bottom-[70px] left-0 right-0 z-fixed border-t bg-background/95 backdrop-blur-sm shadow-elevation-2 lg:hidden">
      <div
        className={cn(
          'flex min-h-[36px] items-center justify-center gap-1.5 px-3 py-1.5 pb-safe-bottom text-xs',
          queueRow.className,
        )}
        aria-live="polite"
      >
        {queueRow.content}
        {syncState.failedCount > 0 && onRetrySync ? (
          <Button type="button" variant="ghost" size="sm" className="ml-1 h-8 min-h-[44px] px-2 text-xs" onClick={onRetrySync}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
};
