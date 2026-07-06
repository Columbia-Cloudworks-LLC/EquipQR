import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import NoteTimelineEntry, { type NoteTimelineEntryData } from '@/components/common/NoteTimelineEntry';
import { CalendarClock } from 'lucide-react';
import { useUpdateHistoricalWorkOrderNoteTimestamp } from '@/features/work-orders/hooks/useWorkOrderNoteTimestamp';

type WorkOrderNoteTimelineEntryProps = {
  note: NoteTimelineEntryData;
  workOrderId: string;
  formatDate: (isoDate: string) => string;
  canEditTimestamp: boolean;
  metaClassName?: string;
  contentClassName?: string;
  contentTextClassName?: string;
};

export function WorkOrderNoteTimelineEntry({
  note,
  workOrderId,
  formatDate,
  canEditTimestamp,
  metaClassName,
  contentClassName,
  contentTextClassName,
}: WorkOrderNoteTimelineEntryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>(() => new Date(note.created_at));
  const updateTimestampMutation = useUpdateHistoricalWorkOrderNoteTimestamp();

  const openEditor = () => {
    setDraftDate(new Date(note.created_at));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!draftDate) {
      return;
    }

    try {
      await updateTimestampMutation.mutateAsync({
        workOrderId,
        noteId: note.id,
        createdAt: draftDate.toISOString(),
      });
      setDialogOpen(false);
    } catch {
      // toast handled by mutation hook
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <NoteTimelineEntry
          note={note}
          formatDate={formatDate}
          metaClassName={metaClassName}
          contentClassName={contentClassName}
          contentTextClassName={contentTextClassName}
        />
        {canEditTimestamp && !note._isPendingSync ? (
          <div className="absolute right-3 top-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={openEditor}
              aria-label={`Edit timestamp for note by ${note.author_name}`}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Edit time
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit note timestamp</DialogTitle>
            <DialogDescription>
              Adjust when this note appears on the historical work order. The organization Audit Log keeps a record of this edit.
            </DialogDescription>
          </DialogHeader>
          <DateTimePicker
            date={draftDate}
            onDateChange={setDraftDate}
            showShortcuts
            placeholder="Pick note date and time"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!draftDate || updateTimestampMutation.isPending}
            >
              {updateTimestampMutation.isPending ? 'Saving...' : 'Save timestamp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
