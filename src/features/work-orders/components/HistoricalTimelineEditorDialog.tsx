import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  useConvertWorkOrderToHistorical,
  useReplaceHistoricalWorkOrderTimeline,
} from '@/features/work-orders/hooks/useHistoricalWorkOrders';
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
  mode?: 'edit' | 'create' | 'convert';
  onCreateSave?: (events: HistoricalTimelineEvent[]) => void;
  historyReady?: boolean;
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
  historyReady = true,
}: HistoricalTimelineEditorDialogProps) {
  const replaceTimelineMutation = useReplaceHistoricalWorkOrderTimeline();
  const convertTimelineMutation = useConvertWorkOrderToHistorical();
  const { isManager } = useWorkOrderPermissionLevels();
  const [draftEvents, setDraftEvents] = useState<HistoricalTimelineEvent[]>([]);
  const [editorSeedEvents, setEditorSeedEvents] = useState<HistoricalTimelineEvent[]>([]);
  const [hasIncompleteRows, setHasIncompleteRows] = useState(false);
  const hasInitializedRef = useRef(false);

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
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }

    if (mode === 'edit' && !historyReady) {
      return;
    }

    if (!hasInitializedRef.current) {
      setEditorSeedEvents(seedEvents);
      setDraftEvents(seedEvents);
      setHasIncompleteRows(false);
      hasInitializedRef.current = true;
    }
  }, [open, seedEvents, mode, historyReady]);

  const validationErrors = validateTimelineEvents(draftEvents);
  const canSave = validationErrors.length === 0 && draftEvents.length > 0 && !hasIncompleteRows;
  const isSaving = replaceTimelineMutation.isPending || convertTimelineMutation.isPending;
  const saveLabel = mode === 'convert' ? 'Convert to historical' : 'Save timeline';

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

    if (mode === 'convert') {
      try {
        await convertTimelineMutation.mutateAsync({
          workOrderId,
          events: draftEvents,
        });
        onOpenChange(false);
      } catch {
        // onError toast handled by mutation hook
      }
      return;
    }

    try {
      await replaceTimelineMutation.mutateAsync({
        workOrderId,
        events: draftEvents,
      });
      onOpenChange(false);
    } catch {
      // onError toast handled by mutation hook
    }
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
          initialEvents={editorSeedEvents}
          organizationId={organizationId}
          equipmentId={equipmentId}
          onChange={setDraftEvents}
          onIncompleteRowsChange={setHasIncompleteRows}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? 'Saving...' : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
