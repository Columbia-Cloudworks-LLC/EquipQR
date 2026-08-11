import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { createNoteMutationHandlers } from '@/components/common/noteMutationHandlers';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

type TestNote = {
  id: string;
  author_id: string;
  created_at: string;
};

const baseNote: TestNote = {
  id: 'note-1',
  author_id: 'user-1',
  created_at: new Date().toISOString(),
};

function createDeps(overrides: Partial<Parameters<typeof createNoteMutationHandlers<TestNote>>[0]> = {}) {
  return {
    organizationId: 'org-1',
    setMutatingNoteId: vi.fn(),
    invalidateNotes: vi.fn(),
    resolvePermissions: vi.fn(() => ({
      canEdit: true,
      canDelete: true,
      canToggleVisibility: true,
      canManageImages: true,
    })),
    updateNote: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    deleteNoteImage: vi.fn().mockResolvedValue(undefined),
    addNoteImages: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('createNoteMutationHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks edit when resolvePermissions denies canEdit', async () => {
    const deps = createDeps({
      resolvePermissions: vi.fn(() => ({
        canEdit: false,
        canDelete: true,
        canToggleVisibility: true,
        canManageImages: false,
      })),
    });
    const { handleEditNote } = createNoteMutationHandlers(deps);

    await expect(
      handleEditNote(baseNote, {
        content: 'updated',
        isPrivate: false,
        removedImageIds: [],
        newImages: [],
      }),
    ).rejects.toThrow('You do not have permission to edit this note');

    expect(deps.updateNote).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('You do not have permission to edit this note');
  });

  it('blocks image changes when canManageImages is false', async () => {
    const deps = createDeps({
      resolvePermissions: vi.fn(() => ({
        canEdit: true,
        canDelete: true,
        canToggleVisibility: true,
        canManageImages: false,
      })),
    });
    const { handleEditNote } = createNoteMutationHandlers(deps);

    await expect(
      handleEditNote(baseNote, {
        content: 'updated',
        isPrivate: false,
        removedImageIds: ['img-1'],
        newImages: [],
      }),
    ).rejects.toThrow('You do not have permission to modify note images');

    expect(deps.updateNote).not.toHaveBeenCalled();
  });

  it('blocks delete when resolvePermissions denies canDelete', async () => {
    const deps = createDeps({
      resolvePermissions: vi.fn(() => ({
        canEdit: false,
        canDelete: false,
        canToggleVisibility: false,
        canManageImages: false,
      })),
    });
    const { handleDeleteNote } = createNoteMutationHandlers(deps);

    await expect(handleDeleteNote(baseNote)).rejects.toThrow(
      'You do not have permission to delete this note',
    );
    expect(deps.deleteNote).not.toHaveBeenCalled();
  });

  it('blocks visibility toggle when resolvePermissions denies canToggleVisibility', async () => {
    const deps = createDeps({
      resolvePermissions: vi.fn(() => ({
        canEdit: true,
        canDelete: true,
        canToggleVisibility: false,
        canManageImages: true,
      })),
    });
    const { handleToggleVisibility } = createNoteMutationHandlers(deps);

    await expect(handleToggleVisibility(baseNote, true)).rejects.toThrow(
      'You do not have permission to change note visibility',
    );
    expect(deps.updateNote).not.toHaveBeenCalled();
  });

  it('runs mutations when permissions allow', async () => {
    const deps = createDeps();
    const { handleDeleteNote } = createNoteMutationHandlers(deps);

    await handleDeleteNote(baseNote);

    expect(deps.deleteNote).toHaveBeenCalledWith(baseNote);
    expect(deps.invalidateNotes).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Note deleted');
  });
});
