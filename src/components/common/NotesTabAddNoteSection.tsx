import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InlineNoteComposerCard } from '@/components/common/InlineNoteComposerCard';
import type { NoteSubmitPayload } from '@/components/common/noteSubmitTypes';

type NotesTabAddNoteSectionProps = {
  noteCount: number;
  showForm: boolean;
  canAddNotes?: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  noteContent: string;
  onNoteContentChange: (value: string) => void;
  onSubmit: (data: NoteSubmitPayload) => void | Promise<void>;
  attachedImages: File[];
  onImagesAdd: (files: File[]) => void;
  onImageRemove: (index: number) => void;
  showPrivateToggle: boolean;
  disabled?: boolean;
  isSubmitting?: boolean;
  userDisplayName?: string;
  cardClassName?: string;
  requestAttachTrigger?: number;
  hideInlineAddButton?: boolean;
};

export function NotesTabAddNoteSection({
  noteCount,
  showForm,
  canAddNotes = true,
  onShowForm,
  onCancelForm,
  noteContent,
  onNoteContentChange,
  onSubmit,
  attachedImages,
  onImagesAdd,
  onImageRemove,
  showPrivateToggle,
  disabled,
  isSubmitting,
  userDisplayName,
  cardClassName,
  requestAttachTrigger,
  hideInlineAddButton,
}: NotesTabAddNoteSectionProps) {
  if (!canAddNotes) return null;

  return (
    <>
      {(noteCount === 0 || showForm) && (
        <InlineNoteComposerCard
          title={noteCount === 0 ? 'Add Your First Note' : 'Add Note'}
          showCancel={noteCount > 0}
          onCancel={onCancelForm}
          cardClassName={cardClassName}
          value={noteContent}
          onChange={onNoteContentChange}
          onSubmit={onSubmit}
          attachedImages={attachedImages}
          onImagesAdd={onImagesAdd}
          onImageRemove={onImageRemove}
          showPrivateToggle={showPrivateToggle}
          disabled={disabled}
          isSubmitting={isSubmitting}
          placeholder="Enter your note..."
          userDisplayName={userDisplayName}
          requestAttachTrigger={requestAttachTrigger}
        />
      )}

      {noteCount > 0 && !showForm && !hideInlineAddButton && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onShowForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      )}
    </>
  );
}
