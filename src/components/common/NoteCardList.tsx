import React from 'react';
import NoteCard from '@/components/common/NoteCard';
import {
  resolveNoteActionPermissions,
  type NoteActionPermissions,
} from '@/components/common/noteCardPermissions';
import type { NoteEditSubmitPayload } from '@/components/common/NoteEditDialog';
import type { NoteTimelineEntryData } from '@/components/common/NoteTimelineEntry';

export interface NoteCardListItem extends NoteTimelineEntryData {
  id: string;
  author_id?: string;
  updated_at?: string;
  last_modified_at?: string;
  _isPendingSync?: boolean;
}

export interface NoteCardListProps<TNote extends NoteCardListItem> {
  notes: TNote[];
  formatDate: (isoDate: string) => string;
  currentUserId?: string;
  isOrgAdmin: boolean;
  isTeamManager: boolean;
  isViewerOrRequestor: boolean;
  editWindowHours: number;
  mutatingNoteId: string | null;
  onEdit: (note: TNote, payload: NoteEditSubmitPayload) => Promise<void>;
  onDelete: (note: TNote) => Promise<void>;
  onToggleVisibility: (note: TNote, isPrivate: boolean) => Promise<void>;
  showLaborHours?: boolean;
  metaClassName?: string;
  contentClassName?: string;
  contentTextClassName?: string;
  renderNote?: (note: TNote, card: React.ReactNode) => React.ReactNode;
  resolvePermissions?: (note: TNote) => NoteActionPermissions;
}

function NoteCardList<TNote extends NoteCardListItem>({
  notes,
  formatDate,
  currentUserId,
  isOrgAdmin,
  isTeamManager,
  isViewerOrRequestor,
  editWindowHours,
  mutatingNoteId,
  onEdit,
  onDelete,
  onToggleVisibility,
  showLaborHours = false,
  metaClassName,
  contentClassName,
  contentTextClassName,
  renderNote,
  resolvePermissions: resolvePermissionsOverride,
}: NoteCardListProps<TNote>) {
  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const actionPermissions =
          resolvePermissionsOverride?.(note) ??
          resolveNoteActionPermissions({
            note,
            currentUserId,
            isOrgAdmin,
            isTeamManager,
            isViewerOrRequestor,
            editWindowHours,
          });

        const card = (
          <NoteCard
            key={note.id}
            note={note}
            formatDate={formatDate}
            showLaborHours={showLaborHours}
            metaClassName={metaClassName}
            contentClassName={contentClassName}
            contentTextClassName={contentTextClassName}
            permissions={actionPermissions}
            isSubmitting={mutatingNoteId === note.id}
            onEdit={(payload) => onEdit(note, payload)}
            onDelete={() => onDelete(note)}
            onToggleVisibility={(isPrivate) => onToggleVisibility(note, isPrivate)}
          />
        );

        if (renderNote) {
          return <React.Fragment key={note.id}>{renderNote(note, card)}</React.Fragment>;
        }

        return card;
      })}
    </div>
  );
}

export default NoteCardList;
