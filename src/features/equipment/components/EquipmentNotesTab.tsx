import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNotesSectionContext } from '@/hooks/useNotesSectionContext';
import { equipment as equipmentQueryKeys } from '@/lib/queryKeys';
import {
  createEquipmentNoteWithImages,
  getEquipmentNotesWithImages,
  deleteEquipmentNote,
  updateEquipmentNote,
  addImagesToEquipmentNote,
  deleteEquipmentNoteImage,
} from '@/features/equipment/services/equipmentNotesService';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOfflineMergedNotes } from '@/features/offline-queue/hooks/useOfflineMergedNotes';
import NotesLoadingSkeleton from '@/components/common/NotesLoadingSkeleton';
import { resolveNoteContentFromSubmit } from '@/components/common/noteContentHelpers';
import type { NoteSubmitPayload } from '@/components/common/noteSubmitTypes';
import {
  createNoteCreateMutationCallbacks,
  runOfflineAwareNoteCreate,
  showQueuedNoteCreateToasts,
} from '@/components/common/noteCreateHelpers';
import { NotesTabAddNoteSection } from '@/components/common/NotesTabAddNoteSection';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useAttachedNoteImages } from '@/hooks/useAttachedNoteImages';
import NoteCardList from '@/components/common/NoteCardList';
import NotesVisibilityFilter from '@/components/common/NotesVisibilityFilter';
import {
  filterNotesByVisibility,
  type NotesVisibilityFilterValue,
} from '@/components/common/noteCardPermissions';
import { createNoteMutationHandlers } from '@/components/common/noteMutationHandlers';
import type { EquipmentNote } from '@/features/equipment/types/equipmentNotes';

interface EquipmentNotesTabProps {
  equipmentId: string;
  organizationId?: string;
  equipmentTeamId?: string;
  currentDisplayImage?: string | null;
}

const EquipmentNotesTab: React.FC<EquipmentNotesTabProps> = ({
  equipmentId,
  organizationId,
  equipmentTeamId,
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { isOrgAdmin, isTeamManager, editWindowHours, isViewerOrRequestor } =
    useNotesSectionContext(equipmentTeamId);
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();
  const [showForm, setShowForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<NotesVisibilityFilterValue>('all');
  const [mutatingNoteId, setMutatingNoteId] = useState<string | null>(null);
  const { attachedImages, handleImagesAdd, handleImageRemove, clearAttachedImages } =
    useAttachedNoteImages();
  const activeOrganizationId = organizationId ?? currentOrganization?.id;
  const { formatDate: formatNoteDate } = useFormatTimestamp();

  const { data: serverNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: equipmentQueryKeys.notesWithImages(equipmentId),
    queryFn: () => getEquipmentNotesWithImages(equipmentId),
    enabled: !!equipmentId,
  });

  const notes = useOfflineMergedNotes(serverNotes, 'equipment', equipmentId);

  const baseVisibleNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (!note.is_private) return true;
        return note.author_id === user?.id || isOrgAdmin || isTeamManager;
      }),
    [notes, user?.id, isOrgAdmin, isTeamManager],
  );

  const visibleNotes = useMemo(
    () => filterNotesByVisibility(baseVisibleNotes, visibilityFilter, user?.id),
    [baseVisibleNotes, visibilityFilter, user?.id],
  );

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.notesWithImages(equipmentId) });
    queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.images(equipmentId) });
    if (activeOrganizationId) {
      queryClient.invalidateQueries({ queryKey: ['equipment', activeOrganizationId] });
    }
  };

  const createNoteMutation = useMutation({
    mutationFn: (input) =>
      runOfflineAwareNoteCreate({
        input,
        organizationId: activeOrganizationId,
        userId: user?.id,
        offlineCreate: async ({ content, hoursWorked, isPrivate, images, machineHours }) => {
          const service = new OfflineAwareWorkOrderService(activeOrganizationId!, user!.id);
          const result = await service.createEquipmentNote(
            equipmentId,
            content,
            hoursWorked,
            isPrivate,
            machineHours,
            images,
          );
          if (result.queuedOffline) {
            return { queuedOffline: true as const, hadImages: images.length > 0 };
          }
          return { queuedOffline: false as const, data: result.data };
        },
        onlineCreate: ({ content, hoursWorked, isPrivate, images, machineHours }) =>
          createEquipmentNoteWithImages(
            equipmentId,
            content,
            hoursWorked,
            isPrivate,
            images,
            activeOrganizationId!,
            machineHours,
          ),
      }),
    ...createNoteCreateMutationCallbacks({
      onQueuedOffline: (hadImages) => {
        showQueuedNoteCreateToasts(hadImages, { combinedOfflineMessage: true });
        offlineCtx?.refresh();
      },
      onOnlineSuccess: () => {
        invalidateNotes();
        toast.success('Note created successfully');
      },
      resetForm: () => {
        setShowForm(false);
        setNoteContent('');
        clearAttachedImages();
      },
    }),
  });

  const handleNoteSubmit = async (data: NoteSubmitPayload) => {
    const userName = user?.email?.split('@')[0] || 'User';
    const finalContent = resolveNoteContentFromSubmit(data, userName, 'count');
    await createNoteMutation.mutateAsync({
      content: finalContent,
      hoursWorked: 0,
      isPrivate: data.isPrivate || false,
      images: data.images,
      machineHours: data.machineHours,
    });
  };

  const { handleEditNote, handleDeleteNote, handleToggleVisibility } = createNoteMutationHandlers<EquipmentNote>({
    organizationId: activeOrganizationId,
    setMutatingNoteId,
    invalidateNotes,
    updateNote: (note, updates) =>
      updateEquipmentNote(activeOrganizationId!, equipmentId, note.id, updates),
    deleteNote: (note) => deleteEquipmentNote(activeOrganizationId!, equipmentId, note.id),
    deleteNoteImage: (imageId) =>
      deleteEquipmentNoteImage(imageId, activeOrganizationId!, equipmentId),
    addNoteImages: (note, files) =>
      addImagesToEquipmentNote(equipmentId, note.id, files, activeOrganizationId!),
  });

  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  if (notesLoading) {
    return <NotesLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <NotesTabAddNoteSection
        noteCount={visibleNotes.length}
        showForm={showForm}
        onShowForm={() => setShowForm(true)}
        onCancelForm={() => {
          setShowForm(false);
          setNoteContent('');
          clearAttachedImages();
        }}
        noteContent={noteContent}
        onNoteContentChange={setNoteContent}
        onSubmit={handleNoteSubmit}
        attachedImages={attachedImages}
        onImagesAdd={handleImagesAdd}
        onImageRemove={handleImageRemove}
        showPrivateToggle
        disabled={createNoteMutation.isPending}
        isSubmitting={createNoteMutation.isPending}
        userDisplayName={userDisplayName}
      />

      {baseVisibleNotes.length > 0 ? (
        <div className="flex justify-end">
          <NotesVisibilityFilter value={visibilityFilter} onChange={setVisibilityFilter} />
        </div>
      ) : null}

      <NoteCardList
        notes={visibleNotes as (EquipmentNote & { _isPendingSync?: boolean })[]}
        formatDate={formatNoteDate}
        currentUserId={user?.id}
        isOrgAdmin={isOrgAdmin}
        isTeamManager={isTeamManager}
        isViewerOrRequestor={isViewerOrRequestor}
        editWindowHours={editWindowHours}
        mutatingNoteId={mutatingNoteId}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
        onToggleVisibility={handleToggleVisibility}
      />
    </div>
  );
};

export default EquipmentNotesTab;
