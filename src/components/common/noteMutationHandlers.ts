import { toast } from 'sonner';
import type { NoteEditSubmitPayload } from '@/components/common/NoteEditDialog';
import type { NoteActionPermissions } from '@/components/common/noteCardPermissions';

type NoteForPermissions = {
  id: string;
  author_id: string;
  created_at: string;
};

interface NoteMutationDeps<TNote extends NoteForPermissions> {
  organizationId?: string;
  setMutatingNoteId: (id: string | null) => void;
  invalidateNotes: () => void;
  resolvePermissions: (note: TNote) => NoteActionPermissions;
  updateNote: (
    note: TNote,
    payload: { content?: string; isPrivate?: boolean },
  ) => Promise<void>;
  deleteNote: (note: TNote) => Promise<void>;
  deleteNoteImage: (imageId: string) => Promise<void>;
  addNoteImages: (note: TNote, files: File[]) => Promise<void>;
}

function denyMutation(message: string): never {
  toast.error(message);
  throw new Error(message);
}

export function createNoteMutationHandlers<TNote extends NoteForPermissions>(
  deps: NoteMutationDeps<TNote>,
) {
  const handleEditNote = async (note: TNote, payload: NoteEditSubmitPayload) => {
    if (!deps.organizationId) return;
    const perms = deps.resolvePermissions(note);
    if (!perms.canEdit) {
      denyMutation('You do not have permission to edit this note');
    }
    if (
      (payload.removedImageIds.length > 0 || payload.newImages.length > 0) &&
      !perms.canManageImages
    ) {
      denyMutation('You do not have permission to modify note images');
    }

    deps.setMutatingNoteId(note.id);
    try {
      await deps.updateNote(note, {
        content: payload.content,
        isPrivate: payload.isPrivate,
      });
      for (const imageId of payload.removedImageIds) {
        await deps.deleteNoteImage(imageId);
      }
      if (payload.newImages.length > 0) {
        await deps.addNoteImages(note, payload.newImages);
      }
      deps.invalidateNotes();
      toast.success('Note updated');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('You do not have permission')) {
        throw error;
      }
      console.error('Failed to update note:', error);
      toast.error('Failed to update note');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  const handleDeleteNote = async (note: TNote) => {
    if (!deps.organizationId) return;
    const perms = deps.resolvePermissions(note);
    if (!perms.canDelete) {
      denyMutation('You do not have permission to delete this note');
    }

    deps.setMutatingNoteId(note.id);
    try {
      await deps.deleteNote(note);
      deps.invalidateNotes();
      toast.success('Note deleted');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('You do not have permission')) {
        throw error;
      }
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  const handleToggleVisibility = async (note: TNote, isPrivate: boolean) => {
    if (!deps.organizationId) return;
    const perms = deps.resolvePermissions(note);
    if (!perms.canToggleVisibility) {
      denyMutation('You do not have permission to change note visibility');
    }

    deps.setMutatingNoteId(note.id);
    try {
      await deps.updateNote(note, { isPrivate });
      deps.invalidateNotes();
      toast.success(isPrivate ? 'Note marked private' : 'Note marked public');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('You do not have permission')) {
        throw error;
      }
      console.error('Failed to update note visibility:', error);
      toast.error('Failed to update note visibility');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  return { handleEditNote, handleDeleteNote, handleToggleVisibility };
}
