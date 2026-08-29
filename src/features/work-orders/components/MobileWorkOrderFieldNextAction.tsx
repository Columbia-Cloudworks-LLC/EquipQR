import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  ClipboardList,
  Camera,
  MessageSquare,
  Play,
  Ban,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { START_WORK_ASSIGNEE_REQUIRED_COPY } from '@/features/work-orders/utils/startWorkActionCopy';
export interface MobileWorkOrderFieldNextActionProps {
  workOrder: {
    id: string;
    status: WorkOrderStatus;
    assignee_id?: string | null;
    has_pm?: boolean;
    updated_at?: string | null;
  };
  pm: {
    status?: string | null;
    progress: number;
    total: number;
  };
  permissions: {
    canAddNotes: boolean;
    canUpload: boolean;
    canWork: boolean;
  };
  sync: {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
  };
  onAcceptWorkOrder: () => void;
  onStartWork: () => void;
  onResumeWork: () => void;
  onContinueChecklist: () => void;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onComplete: () => void;
  onRetrySync?: () => void;
  hideCaptureActions?: boolean;
  hideWorkflowActions?: boolean;
}

function syncBannerCopy(sync: MobileWorkOrderFieldNextActionProps['sync']): {
  tone: 'neutral' | 'warning' | 'destructive' | 'info';
  message: string;
} | null {
  if (sync.failedCount > 0) {
    return { tone: 'destructive', message: 'Sync failed - tap Retry to try again.' };
  }
  if (sync.isSyncing) {
    return { tone: 'info', message: 'Syncing...' };
  }
  if (sync.pendingCount > 0) {
    return { tone: 'warning', message: sync.isOnline ? 'Sync pending' : 'Saved offline - will sync when you reconnect.' };
  }
  if (!sync.isOnline) {
    return { tone: 'warning', message: 'Saved offline - text and status changes sync when you reconnect.' };
  }
  return null;
}

export const MobileWorkOrderFieldNextAction: React.FC<MobileWorkOrderFieldNextActionProps> = ({
  workOrder,
  pm,
  permissions,
  sync,
  onAcceptWorkOrder,
  onStartWork,
  onResumeWork,
  onContinueChecklist,
  onAddNote,
  onAddPhoto,
  onComplete,
  onRetrySync,
  hideCaptureActions = false,
  hideWorkflowActions = false,
}) => {
  const syncBanner = syncBannerCopy(sync);
  const pmIncomplete =
    !!workOrder.has_pm && pm.status !== 'completed' && (pm.total > 0 ? pm.progress < pm.total : true);
  const canStartWork = Boolean(workOrder.assignee_id);
  const quickActionsHelper =
    workOrder.status !== 'completed' &&
    workOrder.status !== 'cancelled' &&
    ((hideWorkflowActions && permissions.canWork) ||
      (hideCaptureActions && !permissions.canWork && (permissions.canAddNotes || permissions.canUpload)))
      ? 'Use Quick actions for tappable work-order actions on phone layouts.'
      : null;

  const noteAndPhotoRow = hideCaptureActions ? null : (
    <div className="flex flex-wrap gap-2">
      {permissions.canAddNotes ? (
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onAddNote}>
          <MessageSquare className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Add note
        </Button>
      ) : null}
      {permissions.canUpload ? (
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onAddPhoto}>
          <Camera className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Photo
        </Button>
      ) : null}
    </div>
  );

  const noteOnlyRow =
    !hideCaptureActions && permissions.canAddNotes ? (
      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onAddNote}>
        <MessageSquare className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Add note
      </Button>
    ) : null;

  return (
    <Card className="border-primary/25 shadow-elevation-2 lg:hidden" aria-label="Next field actions">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Next step</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
          {syncBanner ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5',
                syncBanner.tone === 'destructive' && 'bg-destructive/10 text-destructive',
                syncBanner.tone === 'warning' && 'bg-warning/15 text-warning',
                syncBanner.tone === 'info' && 'bg-info/15 text-info',
              )}
            >
              {sync.failedCount > 0 ? <Ban className="h-4 w-4 shrink-0" aria-hidden /> : null}
              {!sync.isOnline && sync.failedCount === 0 ? <WifiOff className="h-4 w-4 shrink-0" aria-hidden /> : null}
              <span>{syncBanner.message}</span>
              {sync.failedCount > 0 && onRetrySync ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto min-h-11"
                  onClick={onRetrySync}
                >
                  <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
                  Retry sync
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {workOrder.status === 'completed' ? (
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-medium">Completed</span>
          </div>
        ) : null}

        {workOrder.status === 'cancelled' ? (
          <div className="flex min-h-11 items-center gap-2 rounded-lg border bg-muted px-3 py-2">
            <Ban className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">Cancelled</span>
          </div>
        ) : null}

        {workOrder.status === 'submitted' && permissions.canWork && !hideWorkflowActions ? (
          <>
            <Button type="button" className="h-12 min-h-11 w-full text-base font-semibold" onClick={onAcceptWorkOrder}>
              Accept work order
            </Button>
            {noteOnlyRow}
          </>
        ) : null}

        {(workOrder.status === 'accepted' || workOrder.status === 'assigned') &&
        permissions.canWork &&
        !hideWorkflowActions ? (
          <>
            <Button
              type="button"
              className="h-12 min-h-11 w-full text-base font-semibold"
              onClick={onStartWork}
              disabled={!canStartWork}
            >
              <Play className="mr-2 h-5 w-5" aria-hidden />
              Start work
            </Button>
            {!canStartWork ? (
              <p className="text-sm text-muted-foreground">{START_WORK_ASSIGNEE_REQUIRED_COPY}</p>
            ) : null}
            {noteAndPhotoRow}
          </>
        ) : null}

        {workOrder.status === 'in_progress' && permissions.canWork && !hideWorkflowActions ? (
          <>
            {pmIncomplete ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Checklist:{' '}
                  <span className="font-medium text-foreground">
                    {pm.progress} of {pm.total} items
                  </span>
                </p>
                <Button
                  type="button"
                  className="h-12 min-h-11 w-full text-base font-semibold"
                  onClick={onContinueChecklist}
                >
                  <ClipboardList className="mr-2 h-5 w-5" aria-hidden />
                  Continue checklist
                </Button>
              </>
            ) : (
              <Button type="button" className="h-12 min-h-11 w-full text-base font-semibold" onClick={onComplete}>
                <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden />
                Complete work order
              </Button>
            )}
            {noteAndPhotoRow}
          </>
        ) : null}

        {workOrder.status === 'on_hold' && permissions.canWork && !hideWorkflowActions ? (
          <>
            <Button type="button" className="h-12 min-h-11 w-full text-base font-semibold" onClick={onResumeWork}>
              <Play className="mr-2 h-5 w-5" aria-hidden />
              Resume work
            </Button>
            {noteAndPhotoRow}
          </>
        ) : null}

        {!hideCaptureActions &&
        !permissions.canWork &&
        workOrder.status !== 'completed' &&
        workOrder.status !== 'cancelled' &&
        (permissions.canAddNotes || permissions.canUpload) ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">View-only — capture only</p>
            {noteAndPhotoRow}
          </div>
        ) : null}

        {quickActionsHelper ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
            {quickActionsHelper}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

