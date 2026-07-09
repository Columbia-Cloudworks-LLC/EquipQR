import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import NoteEntryMeta from '@/components/common/NoteEntryMeta';
import NoteImageCarousel from '@/components/common/NoteImageCarousel';
import NoteEditDialog, { type NoteEditSubmitPayload } from '@/components/common/NoteEditDialog';
import { isNoteEdited, type NoteActionPermissions } from '@/components/common/noteCardPermissions';
import type { NoteTimelineEntryData, NoteTimelineImage } from '@/components/common/NoteTimelineEntry';

export interface NoteCardProps {
  note: NoteTimelineEntryData & {
    author_id?: string;
    updated_at?: string;
    last_modified_at?: string;
  };
  formatDate: (isoDate: string) => string;
  metaClassName?: string;
  contentClassName?: string;
  contentTextClassName?: string;
  showLaborHours?: boolean;
  permissions: NoteActionPermissions;
  isSubmitting?: boolean;
  onEdit?: (payload: NoteEditSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  onToggleVisibility?: (isPrivate: boolean) => Promise<void>;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  formatDate,
  metaClassName = 'text-sm text-muted-foreground',
  contentClassName = 'prose prose-sm max-w-none',
  contentTextClassName = 'whitespace-pre-wrap',
  showLaborHours = false,
  permissions,
  isSubmitting = false,
  onEdit,
  onDelete,
  onToggleVisibility,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const edited = isNoteEdited(note.created_at, note.updated_at, note.last_modified_at);
  const images = (note.images ?? []) as NoteTimelineImage[];

  return (
    <>
      <Card>
        <CardContent standalone>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {images.length > 0 ? (
              <div className="w-full shrink-0 sm:w-40 md:w-48 lg:w-56">
                <NoteImageCarousel images={images} />
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
                  showEditedBadge={edited}
                  isPendingSync={note._isPendingSync}
                  metaClassName={metaClassName}
                />

                <div className="flex shrink-0 items-center gap-1">
                  {note.is_private ? (
                    <Badge variant="outline" className="text-xs">
                      <EyeOff className="mr-1 h-3 w-3" aria-hidden />
                      Private
                    </Badge>
                  ) : null}
                  {permissions.canToggleVisibility && onToggleVisibility ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isSubmitting}
                      onClick={() => void onToggleVisibility(!note.is_private)}
                      aria-label={note.is_private ? 'Make note public' : 'Make note private'}
                    >
                      {note.is_private ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  ) : null}
                  {permissions.canEdit && onEdit ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isSubmitting}
                      onClick={() => setEditOpen(true)}
                      aria-label="Edit note"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {permissions.canDelete && onDelete ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={isSubmitting}
                      onClick={() => setDeleteOpen(true)}
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className={contentClassName}>
                <p className={contentTextClassName}>{note.content}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {permissions.canEdit && onEdit ? (
        <NoteEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initialContent={note.content}
          initialIsPrivate={Boolean(note.is_private)}
          existingImages={images}
          canToggleVisibility={permissions.canToggleVisibility}
          canManageImages={permissions.canManageImages}
          isSubmitting={isSubmitting}
          onSubmit={async (payload) => {
            await onEdit(payload);
            setEditOpen(false);
          }}
        />
      ) : null}

      {permissions.canDelete && onDelete ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the note and its attached images. The action is recorded in the audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  void onDelete().then(() => setDeleteOpen(false));
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
};

export default NoteCard;
