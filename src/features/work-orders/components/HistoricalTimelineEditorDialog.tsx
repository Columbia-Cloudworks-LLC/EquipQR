import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HistoricalTimelineEditor } from '@/features/work-orders/components/HistoricalTimelineEditor';
import {
  useConvertWorkOrderToHistorical,
  useReplaceHistoricalWorkOrderTimeline,
} from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import {
  areTimelineEventsEqual,
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
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [editorSeeded, setEditorSeeded] = useState(false);

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
      setEditorSeeded(false);
      setConfirmDiscardOpen(false);
      return;
    }

    if (mode === 'edit' && !historyReady) {
      return;
    }

    if (!editorSeeded) {
      setEditorSeedEvents(seedEvents);
      setDraftEvents(seedEvents);
      setHasIncompleteRows(false);
      setEditorSeeded(true);
    }
  }, [open, seedEvents, mode, historyReady, editorSeeded]);

  const validationErrors = validateTimelineEvents(draftEvents);
  const isInitializing = open && mode === 'edit' && !editorSeeded;
  const isInvalid = editorSeeded && (hasIncompleteRows || validationErrors.length > 0);
  const isDirty = useMemo(
    () => !areTimelineEventsEqual(draftEvents, editorSeedEvents),
    [draftEvents, editorSeedEvents],
  );
  const canSave = validationErrors.length === 0 && draftEvents.length > 0 && !hasIncompleteRows;
  const isSaving = replaceTimelineMutation.isPending || convertTimelineMutation.isPending;
  const saveLabel = mode === 'convert' ? 'Convert to historical' : 'Save timeline';

  const performClose = () => {
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (isInitializing) {
      performClose();
      return;
    }

    if (isInvalid) {
      return;
    }

    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }

    performClose();
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    handleRequestClose();
  };

  const handleConfirmDiscard = () => {
    setConfirmDiscardOpen(false);
    performClose();
  };

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
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            handleRequestClose();
          }}
        >
          <DialogHeader className="space-y-1 border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              {mode === 'convert' ? (
                <>
                  Backdate status events from paper records. The work order will be marked as a
                  historical record and timeline dates can reflect when work actually happened in
                  the field.
                </>
              ) : (
                <>
                  Operational timeline dates reflect when work happened. The organization Audit Log
                  continues to record when edits were made in EquipQR.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isInitializing ? (
              <p className="text-sm text-muted-foreground">Loading historical timeline…</p>
            ) : (
              <HistoricalTimelineEditor
                initialEvents={editorSeedEvents}
                organizationId={organizationId}
                equipmentId={equipmentId}
                onChange={setDraftEvents}
                onIncompleteRowsChange={setHasIncompleteRows}
              />
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              disabled={isInvalid}
            >
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

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard timeline changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your timeline edits have not been saved. Stay to keep editing, or discard to close without saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
