export type NotesVisibilityFilterValue = 'all' | 'public' | 'private';

export interface NoteWithPrivacy {
  id: string;
  is_private?: boolean;
  author_id?: string;
}

export function filterNotesByVisibility<T extends NoteWithPrivacy>(
  notes: T[],
  filter: NotesVisibilityFilterValue,
  currentUserId?: string,
): T[] {
  if (filter === 'all') return notes;
  if (filter === 'public') return notes.filter((note) => !note.is_private);
  return notes.filter((note) => note.is_private && note.author_id === currentUserId);
}

export function isNoteEdited(
  createdAt: string,
  updatedAt?: string | null,
  lastModifiedAt?: string | null,
): boolean {
  const editedMarker = lastModifiedAt || updatedAt;
  if (!editedMarker) return false;
  const created = new Date(createdAt).getTime();
  const edited = new Date(editedMarker).getTime();
  return edited - created > 60_000;
}

const DEFAULT_EDIT_WINDOW_HOURS = 24;

export function isWithinAuthorEditWindow(
  createdAt: string,
  editWindowHours: number = DEFAULT_EDIT_WINDOW_HOURS,
): boolean {
  const created = new Date(createdAt).getTime();
  const windowMs = editWindowHours * 60 * 60 * 1000;
  return Date.now() - created <= windowMs;
}

export interface NoteActionPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canToggleVisibility: boolean;
  canManageImages: boolean;
}

export interface ResolveNoteActionsInput {
  note: { id: string; author_id: string; created_at: string };
  currentUserId?: string;
  isOrgAdmin: boolean;
  isTeamManager: boolean;
  isViewerOrRequestor: boolean;
  editWindowHours?: number;
}

export function resolveNoteActionPermissions(
  input: ResolveNoteActionsInput,
): NoteActionPermissions {
  const {
    note,
    currentUserId,
    isOrgAdmin,
    isTeamManager,
    isViewerOrRequestor,
    editWindowHours = DEFAULT_EDIT_WINDOW_HOURS,
  } = input;

  const isAuthor = note.author_id === currentUserId;
  const canManageAny = isOrgAdmin || isTeamManager;
  const withinWindow = isWithinAuthorEditWindow(note.created_at, editWindowHours);

  const canEdit = canManageAny || (isAuthor && withinWindow);
  const canDelete = canManageAny || isAuthor;
  const canToggleVisibility =
    canManageAny || (isAuthor && !isViewerOrRequestor);
  const canManageImages = canEdit;

  return { canEdit, canDelete, canToggleVisibility, canManageImages };
}
