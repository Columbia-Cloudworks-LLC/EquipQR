import React from 'react';
import { Clock, Gauge, User } from 'lucide-react';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import { formatNoteHoursWorked, formatNoteMachineHours } from '@/components/common/noteFormatHelpers';

interface NoteEntryMetaProps {
  authorName: string;
  createdAt: string;
  formatDate: (isoDate: string) => string;
  hoursWorked?: number | null;
  machineHours?: number | null;
  showLaborHours?: boolean;
  showEditedBadge?: boolean;
  isPendingSync?: boolean;
  metaClassName?: string;
}

const NoteEntryMeta: React.FC<NoteEntryMetaProps> = ({
  authorName,
  createdAt,
  formatDate,
  hoursWorked,
  machineHours,
  showLaborHours = false,
  showEditedBadge = false,
  isPendingSync = false,
  metaClassName = 'text-sm text-muted-foreground',
}) => {
  const machineLabel = formatNoteMachineHours(machineHours);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${metaClassName}`}>
      <User className="h-4 w-4 shrink-0" aria-hidden />
      <span className={showEditedBadge ? 'font-medium text-foreground' : undefined}>{authorName}</span>
      {showEditedBadge ? (
        <span className="rounded border px-1.5 py-0 text-[10px]">Edited</span>
      ) : null}
      {isPendingSync ? <PendingSyncBadge /> : null}
      <span aria-hidden>•</span>
      <span>{formatDate(createdAt)}</span>
      {showLaborHours && formatNoteHoursWorked(hoursWorked) ? (
        <>
          <span aria-hidden>•</span>
          <Clock className="h-4 w-4" aria-hidden />
          <span title="Hours worked">{formatNoteHoursWorked(hoursWorked)} worked</span>
        </>
      ) : null}
      {machineLabel ? (
        <>
          <span aria-hidden>•</span>
          <Gauge className="h-4 w-4" aria-hidden />
          <span title="Machine hours">{machineLabel} machine</span>
        </>
      ) : null}
    </div>
  );
};

export default NoteEntryMeta;
