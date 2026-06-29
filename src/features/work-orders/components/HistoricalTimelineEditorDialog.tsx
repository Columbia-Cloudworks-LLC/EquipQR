import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HistoricalTimelineEditor } from '@/features/work-orders/components/HistoricalTimelineEditor';
import { useReplaceHistoricalWorkOrderTimeline } from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import {
  historyRowsToEvents,
  validateTimelineEvents,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';
import type { WorkOrderTimelineHistoryRow } from '@/features/work-orders/services/historicalTimelineService';

type HistoricalTimelineEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  organizationId: string;
  equipmentId: string;
  title?: string;
  historyRows?: WorkOrderTimelineHistoryRow[];
  initialEvents?: HistoricalTimelineEvent[];
  mode?: 'edit' | 'create';
  onCreateSave?: (events: HistoricalTimelineEvent[]) => void;
};

export function HistoricalTimelineEditorDialog({
  open,
  onOpenChange,
  workOrderId,
  organizationId,
  equipmentId,
  title = 'Edit historical timeline',
  historyRows,
  initialEvents,
  mode = 'edit',
  onCreateSave,
}: HistoricalTimelineEditorDialogProps) {
  const replaceTimelineMutation = useReplaceHistoricalWorkOrderTimeline();
  const { isManager } = useWorkOrderPermissionLevels();
  const [draftEvents, setDraftEvents] = useState<HistoricalTimelineEvent[]>([]);

  const seedEvents = useMemo(() => {
    if (initialEvents && initialEvents.length > 0) {
      return initialEvents;
    }
    if (historyRows && historyRows.length > 0) {
      return historyRowsToEvents(historyRows);
    }
    return [];
  }, [historyRows, initialEvents]);

  useEffect(() => {
    if (open) {
      setDraftEvents(seedEvents);
    }
  }, [open, seedEvents]);

  const validationErrors = validateTimelineEvents(draftEvents);
  const canSave = validationErrors.length === 0 && draftEvents.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    if (mode === 'create') {
      onCreateSave?.(draftEvents);
      onOpenChange(false);
      return;
    }

    if (!isManager) {
      return;
    }

    await replaceTimelineMutation.mutateAsync({
      workOrderId,
      events: draftEvents,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Operational timeline dates reflect when work happened. Change History continues to record when edits were made in EquipQR.
          </DialogDescription>
        </DialogHeader>

        <HistoricalTimelineEditor
          initialEvents={seedEvents}
          organizationId={organizationId}
          equipmentId={equipmentId}
          onChange={setDraftEvents}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || replaceTimelineMutation.isPending}
          >
            {replaceTimelineMutation.isPending ? 'Saving...' : 'Save timeline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
