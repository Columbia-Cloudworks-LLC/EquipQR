/**
 * Sticky bottom action tray for mobile work-order details across active statuses.
 * Primary workflow moves out of Info/sidebar into thumb-reachable space.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Camera,
  CheckCircle,
  Pause,
  Play,
  Loader2,
  WifiOff,
  RefreshCw,
  Timer,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

export type MobileFooterSyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
};

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
  has_pm?: boolean;
  assignee_id?: string | null;
  created_by?: string | null;
};

export interface MobileWorkOrderActionFooterProps {
  workOrder: FooterWorkOrder;
  organizationId: string;
  /** PM checklist is complete enough to allow WO completion gate */
  canCompletePm: boolean;
  canAddNotes: boolean;
  isUpdatingStatusExternal?: boolean;
  /** Queue + browser online from OfflineQueueContext */
  syncState: MobileFooterSyncState;
  onRetrySync?: () => void;
  timerDisplay?: string;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onStartWork: () => void;
  /** Put on hold from assigned / accepted */
  onAssignedPutOnHold: () => void;
  /**
   * Toggles pause vs resume for in-progress / on-hold; parent owns undo toast.
   */
  onPauseResume: () => void;
  /** Opens Complete confirmation dialog after PM gate passes */
  onOpenCompleteDialog: () => void;
  onScrollToChecklist: () => void;
  /** Opens accept-work-order modal (submitted) */
  onRequestAccept: () => void;
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
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
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
  return {
    className: 'bg-muted/80 text-muted-foreground',
    content: <span>Saved</span>,
  };
}

export const MobileWorkOrderActionFooter: React.FC<MobileWorkOrderActionFooterProps> = ({
  workOrder,
  organizationId,
  canCompletePm,
  canAddNotes,
  isUpdatingStatusExternal = false,
  syncState,
  onRetrySync,
  timerDisplay,
  isTimerRunning,
  onToggleTimer,
  onAddNote,
  onAddPhoto,
  onStartWork,
  onAssignedPutOnHold,
  onPauseResume,
  onOpenCompleteDialog,
  onScrollToChecklist,
  onRequestAccept,
}) => {
  const { user } = useAuth();
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();

  const isPending = isUpdatingStatusExternal;

  const canPerformWorkflow = () => {
    if (isManager) return true;
    if (isTechnician && workOrder.assignee_id === user?.id) return true;
    return !!(workOrder.created_by === user?.id && workOrder.status === 'submitted');
  };

  const completionBlockedByPm =
    workOrder.status === 'in_progress' && !!workOrder.has_pm && !canCompletePm;

  if (!organizationId || !canPerformWorkflow()) {
    return null;
  }

  const isOnHold = workOrder.status === 'on_hold';
  const isInProgress = workOrder.status === 'in_progress';
  const isAssignedLike = workOrder.status === 'assigned' || workOrder.status === 'accepted';
  const isSubmitted = workOrder.status === 'submitted';
  const showTimerRow = (isInProgress || isOnHold) && Boolean(timerDisplay);
  const showQuickCaptureRow = canAddNotes && !isSubmitted;

  const queueRow = footerQueueMessage(syncState);

  return (
    <div className="fixed bottom-[70px] left-0 right-0 z-fixed border-t bg-background/95 backdrop-blur-sm shadow-elevation-2 lg:hidden">
      <div
        className={cn(
          'flex min-h-[36px] items-center justify-center gap-1.5 px-3 py-1.5 text-xs',
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

      <div className="space-y-2 p-3 pb-safe-bottom">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              isOnHold
                ? 'border-warning/30 bg-warning/10 text-warning'
                : isInProgress
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'bg-muted text-foreground',
            )}
          >
            {formatFooterStatusBadge(workOrder.status)}
          </Badge>

          {showTimerRow && timerDisplay ? (
            <button
              type="button"
              onClick={() => {
                if (onToggleTimer) onToggleTimer();
              }}
              disabled={!onToggleTimer}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm transition-colors',
                isTimerRunning ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                !onToggleTimer && 'cursor-not-allowed opacity-50',
              )}
            >
              <Timer className={cn('h-3.5 w-3.5', isTimerRunning && 'animate-pulse')} aria-hidden />
              <span aria-label="Work timer">{timerDisplay}</span>
            </button>
          ) : null}
        </div>

        {showQuickCaptureRow ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-11 min-h-[44px] flex-1 sm:flex-none" onClick={onAddNote}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Note
            </Button>
            <Button variant="outline" size="sm" className="h-11 min-h-[44px] px-3" onClick={onAddPhoto} aria-label="Add photo">
              <Camera className="mr-1 h-4 w-4" aria-hidden />
              <span className="text-xs">Photo</span>
            </Button>
          </div>
        ) : null}

        {isSubmitted ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" className="min-h-[44px] flex-1" disabled={isPending} onClick={onRequestAccept}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle className="mr-2 h-4 w-4" aria-hidden />}
              Accept
            </Button>
          </div>
        ) : null}

        {isAssignedLike ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" className="min-h-[44px] flex-1" disabled={isPending} onClick={onStartWork}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Play className="mr-2 h-4 w-4" aria-hidden />}
              Start Work
            </Button>
            <Button variant="outline" size="sm" className="min-h-[44px] flex-1" disabled={isPending} onClick={onAssignedPutOnHold}>
              {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : <Pause className="mr-1 h-4 w-4" aria-hidden />}
              Put on Hold
            </Button>
          </div>
        ) : null}

        {isInProgress ? (
          <>
            {completionBlockedByPm ? (
              <div className="space-y-2">
                <p className="px-0.5 text-xs text-muted-foreground">
                  Finish the checklist before completing this work order.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="min-h-[44px] w-full"
                  type="button"
                  onClick={onScrollToChecklist}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
                  Continue Checklist
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] w-full"
                  disabled={isPending}
                  onClick={() => void onPauseResume()}
                  aria-label={isPending ? 'Updating status' : 'Put work order on hold'}
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Pause className="mr-2 h-4 w-4" aria-hidden />}
                  Put on Hold
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-stretch gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={isPending}
                  onClick={() => void onPauseResume()}
                  aria-label={isPending ? 'Updating status' : 'Put work order on hold'}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Pause className="mr-1 h-4 w-4" aria-hidden />}
                  <span className="text-xs sm:text-sm">Put on Hold</span>
                </Button>

                <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                  <Button
                    variant="default"
                    size="sm"
                    type="button"
                    className="min-h-[44px] h-auto w-full flex-col gap-1 py-2 font-semibold sm:flex-row sm:justify-center"
                    disabled={isPending}
                    onClick={() => onOpenCompleteDialog()}
                  >
                    <span className="inline-flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" aria-hidden />
                      Complete
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {isOnHold ? (
          <Button variant="default" size="sm" className="h-11 min-h-[44px] w-full" disabled={isPending} onClick={() => void onPauseResume()}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Play className="mr-2 h-4 w-4" aria-hidden />}
            Resume Work
          </Button>
        ) : null}
      </div>
    </div>
  );
};

function formatFooterStatusBadge(status: FooterWorkOrder['status']): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'accepted':
      return 'Accepted';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'on_hold':
      return 'On Hold';
    default:
      return status.replace(/_/g, ' ');
  }
}

export default MobileWorkOrderActionFooter;
