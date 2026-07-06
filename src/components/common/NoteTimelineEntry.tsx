import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Gauge, Images, User, EyeOff } from 'lucide-react';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import { formatNoteHoursWorked, formatNoteMachineHours } from '@/components/common/noteFormatHelpers';

export interface NoteTimelineImage {
  id: string;
  file_url: string;
  file_name: string;
}

export interface NoteTimelineEntryData {
  id: string;
  author_name: string;
  created_at: string;
  content: string;
  hours_worked?: number | null;
  machine_hours?: number | null;
  is_private?: boolean;
  images?: NoteTimelineImage[];
  _isPendingSync?: boolean;
}

interface NoteTimelineEntryProps {
  note: NoteTimelineEntryData;
  formatDate: (isoDate: string) => string;
  metaClassName?: string;
  contentClassName?: string;
  contentTextClassName?: string;
  /**
   * Hide labor hours from customer-facing roles (requestor/viewer) that must
   * stay oblivious to internal labor data. Defaults to visible for
   * non-work-order surfaces.
   */
  showLaborHours?: boolean;
}

const NoteTimelineEntry: React.FC<NoteTimelineEntryProps> = ({
  note,
  formatDate,
  metaClassName = 'text-sm text-muted-foreground',
  contentClassName = 'prose prose-sm max-w-none',
  contentTextClassName = 'whitespace-pre-wrap',
  showLaborHours = true,
}) => {
  const machineLabel = formatNoteMachineHours(note.machine_hours);

  return (
    <Card key={note.id}>
      <CardContent standalone>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className={`flex items-center gap-2 flex-wrap ${metaClassName}`}>
              <User className="h-4 w-4" />
              <span>{note.author_name}</span>
              {note._isPendingSync && <PendingSyncBadge />}
              <span>•</span>
              <span>{formatDate(note.created_at)}</span>
              {showLaborHours && formatNoteHoursWorked(note.hours_worked) && (
                <>
                  <span>•</span>
                  <Clock className="h-4 w-4" />
                  <span title="Hours worked">{formatNoteHoursWorked(note.hours_worked)} worked</span>
                </>
              )}
              {machineLabel && (
                <>
                  <span>•</span>
                  <Gauge className="h-4 w-4" />
                  <span title="Machine hours">{machineLabel} machine</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {note.is_private && (
                <Badge variant="outline" className="text-xs">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
              {note.images && note.images.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Images className="h-3 w-3 mr-1" />
                  {note.images.length} image{note.images.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className={contentClassName}>
            <p className={contentTextClassName}>{note.content}</p>
          </div>

          {note.images && note.images.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {note.images.map((image) => (
                  <div key={image.id} className="aspect-square bg-muted rounded overflow-hidden">
                    <img
                      src={image.file_url}
                      alt={image.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteTimelineEntry;
