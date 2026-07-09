import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EyeOff } from 'lucide-react';
import NoteEntryMeta from '@/components/common/NoteEntryMeta';
import NoteImageCarousel from '@/components/common/NoteImageCarousel';

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
   * stay oblivious to internal labor data. Secure default: hidden until a
   * caller explicitly grants operational visibility.
   */
  showLaborHours?: boolean;
}

const NoteTimelineEntry: React.FC<NoteTimelineEntryProps> = ({
  note,
  formatDate,
  metaClassName = 'text-sm text-muted-foreground',
  contentClassName = 'prose prose-sm max-w-none',
  contentTextClassName = 'whitespace-pre-wrap',
  showLaborHours = false,
}) => {
  return (
    <Card key={note.id}>
      <CardContent standalone>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {note.images && note.images.length > 0 ? (
            <div className="w-full shrink-0 sm:w-40 md:w-48 lg:w-56">
              <NoteImageCarousel images={note.images} />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <NoteEntryMeta
                authorName={note.author_name}
                createdAt={note.created_at}
                formatDate={formatDate}
                hoursWorked={note.hours_worked}
                machineHours={note.machine_hours}
                showLaborHours={showLaborHours}
                isPendingSync={note._isPendingSync}
                metaClassName={metaClassName}
              />

              {note.is_private ? (
                <Badge variant="outline" className="text-xs shrink-0">
                  <EyeOff className="mr-1 h-3 w-3" aria-hidden />
                  Private
                </Badge>
              ) : null}
            </div>

            <div className={contentClassName}>
              <p className={contentTextClassName}>{note.content}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteTimelineEntry;
