import React from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { OfflineQueueService, type OfflineQueueItem } from '@/services/offlineQueueService';
import { defaultUserSettings } from '@/types/settings';
import { formatDateTime } from '@/utils/dateFormatter';

interface OfflineQueueManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM_TYPE_LABELS: Record<OfflineQueueItem['type'], string> = {
  work_order_create: 'New Work Order',
  work_order_update: 'Work Order Update',
  work_order_status: 'Work Order Status Change',
  work_order_note: 'Work Order Note',
  equipment_create: 'New Equipment (Quick)',
  equipment_create_full: 'New Equipment Intake',
  equipment_update: 'Equipment Update',
  equipment_hours: 'Meter / Working Hours',
  equipment_note: 'Equipment Note',
  equipment_scan: 'Equipment QR Scan',
  pm_init: 'PM Checklist Setup',
  pm_update: 'PM Checklist Update',
  pm_delete: 'PM Checklist Removal',
};

function describeQueueItem(item: OfflineQueueItem): string {
  switch (item.type) {
    case 'equipment_create':
    case 'equipment_create_full':
      return `${item.payload.name} (${item.payload.manufacturer} ${item.payload.model} • S/N ${item.payload.serial_number})`;
    case 'equipment_update':
      return `Equipment ${item.payload.equipmentId.slice(0, 8)}...`;
    case 'equipment_hours':
      return `${item.payload.newHours} hrs on equipment ${item.payload.equipmentId.slice(0, 8)}...`;
    case 'equipment_note':
      return item.payload.content.slice(0, 80);
    case 'equipment_scan':
      return `Scanned at ${formatDateTime(item.payload.scannedAt, defaultUserSettings)}`;
    case 'work_order_create':
      return item.payload.title;
    case 'work_order_update':
      return `Work order ${item.payload.workOrderId.slice(0, 8)}...`;
    case 'work_order_status':
      return `Status → ${item.payload.newStatus}`;
    case 'work_order_note':
      return item.payload.content.slice(0, 80);
    case 'pm_init':
    case 'pm_update':
    case 'pm_delete':
      return 'Preventative maintenance checklist';
  }
}

export const OfflineQueueManagerDrawer: React.FC<OfflineQueueManagerDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    queuedItems,
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    syncNow,
    retryFailed,
    removeItem,
  } = useOfflineQueue();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-warning" />
              )}
              Offline Sync Queue
            </SheetTitle>
            <Badge variant="outline">
              {isOnline ? 'Online' : 'Offline Mode'} • {queuedItems.length} item
              {queuedItems.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <SheetDescription>
            Review equipment intake records, attached nameplate photos, scans, and work order
            updates queued on this device. Items sync automatically when connectivity resumes.
          </SheetDescription>

          <div className="flex flex-wrap gap-2 pt-1">
            {pendingCount > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={!isOnline || isSyncing}
                onClick={() => void syncNow()}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : `Sync All (${pendingCount})`}
              </Button>
            )}
            {failedCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isOnline || isSyncing}
                onClick={() => void retryFailed()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry Failed ({failedCount})
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 py-4">
          {queuedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <p className="text-sm font-medium">All changes are synced</p>
              <p className="text-xs text-muted-foreground">
                Equipment records, photos, and scans created while offline will appear here until
                uploaded.
              </p>
            </div>
          ) : (
            queuedItems.map((item) => {
              const photoCount = OfflineQueueService.collectImageRefsFromItem(item).length;
              const isConflict = item.conflictState === 'sync_conflict';
              const isFailed = item.status === 'failed';

              return (
                <div
                  key={item.id}
                  data-testid={`offline-queue-item-${item.id}`}
                  className="rounded-lg border bg-card p-3.5 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {ITEM_TYPE_LABELS[item.type]}
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">
                        {describeQueueItem(item)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        isConflict || isFailed
                          ? 'destructive'
                          : item.status === 'processing'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="shrink-0 text-[11px]"
                    >
                      {isConflict
                        ? 'Sync Conflict'
                        : isFailed
                          ? 'Failed'
                          : item.status === 'processing'
                            ? 'Syncing'
                            : 'Pending'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(new Date(item.timestamp), defaultUserSettings)}
                    </span>
                    {photoCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        {photoCount} photo{photoCount === 1 ? '' : 's'} staged
                      </span>
                    )}
                    {item.retryCount > 0 && (
                      <span>
                        Attempt {item.retryCount}/{item.maxRetries}
                      </span>
                    )}
                  </div>

                  {item.lastError && (
                    <div className="flex items-start gap-1.5 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {isConflict
                          ? `Conflict detected: ${item.lastError}. Delete this draft or retry if resolved.`
                          : item.lastError}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete Draft
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
