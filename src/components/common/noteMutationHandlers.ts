import { toast } from 'sonner';
import type { NoteEditSubmitPayload } from '@/components/common/NoteEditDialog';

interface NoteMutationDeps<TNote extends { id: string }> {
  organizationId?: string;
  setMutatingNoteId: (id: string | null) => void;
  invalidateNotes: () => void;
  updateNote: (
    note: TNote,
    payload: { content?: string; isPrivate?: boolean },
  ) => Promise<void>;
  deleteNote: (note: TNote) => Promise<void>;
  deleteNoteImage: (imageId: string) => Promise<void>;
  addNoteImages: (note: TNote, files: File[]) => Promise<void>;
}

export function createNoteMutationHandlers<TNote extends { id: string }>(deps: NoteMutationDeps<TNote>) {
  const handleEditNote = async (note: TNote, payload: NoteEditSubmitPayload) => {
    if (!deps.organizationId) return;
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
      console.error('Failed to update note:', error);
      toast.error('Failed to update note');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  const handleDeleteNote = async (note: TNote) => {
    if (!deps.organizationId) return;
    deps.setMutatingNoteId(note.id);
    try {
      await deps.deleteNote(note);
      deps.invalidateNotes();
      toast.success('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  const handleToggleVisibility = async (note: TNote, isPrivate: boolean) => {
    if (!deps.organizationId) return;
    deps.setMutatingNoteId(note.id);
    try {
      await deps.updateNote(note, { isPrivate });
      deps.invalidateNotes();
      toast.success(isPrivate ? 'Note marked private' : 'Note marked public');
    } catch (error) {
      console.error('Failed to update note visibility:', error);
      toast.error('Failed to update note visibility');
      throw error;
    } finally {
      deps.setMutatingNoteId(null);
    }
  };

  return { handleEditNote, handleDeleteNote, handleToggleVisibility };
}
