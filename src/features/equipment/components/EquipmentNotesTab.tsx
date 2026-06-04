import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Images } from 'lucide-react';
import NoteTimelineEntry from '@/components/common/NoteTimelineEntry';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { equipment as equipmentQueryKeys } from '@/lib/queryKeys';
import {
  createEquipmentNoteWithImages,
  getEquipmentNotesWithImages,
  getEquipmentImages,
  deleteEquipmentNoteImage,
  updateEquipmentDisplayImage,
} from '@/features/equipment/services/equipmentNotesService';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOfflineMergedNotes } from '@/features/offline-queue/hooks/useOfflineMergedNotes';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';
import ImageGallery from '@/components/common/ImageGallery';
import NotesLoadingSkeleton from '@/components/common/NotesLoadingSkeleton';
import { resolveNoteContentFromSubmit } from '@/components/common/noteContentHelpers';
import type { NoteSubmitPayload } from '@/components/common/noteSubmitTypes';
import {
  handleNoteCreateMutationSuccess,
  shouldUseOfflineNotePath,
  showQueuedNoteCreateToasts,
} from '@/components/common/noteCreateHelpers';
import { OfflineFormBanner } from '@/features/offline-queue/components/OfflineFormBanner';
import { logger } from '@/utils/logger';
import { useEquipmentNotesPermissions } from '@/features/equipment/hooks/useEquipmentNotesPermissions';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';

interface EquipmentNotesTabProps {
  equipmentId: string;
  organizationId?: string;
  /** Team the equipment belongs to — used for permission checks. */
  equipmentTeamId?: string;
  /**
   * Current display image URL for the equipment. Passed from
   * `EquipmentDetails` so this tab does not issue a duplicate
   * `select image_url from equipment` query — the parent already has the
   * full row cached via `useEquipmentById`.
   */
  currentDisplayImage?: string | null;
}

const EquipmentNotesTab: React.FC<EquipmentNotesTabProps> = ({
  equipmentId,
  organizationId,
  equipmentTeamId,
  currentDisplayImage,
}) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();
  const [showForm, setShowForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const activeOrganizationId = organizationId ?? currentOrganization?.id;
  const permissions = useEquipmentNotesPermissions(equipmentTeamId);
  const { formatDate: formatNoteDate } = useFormatTimestamp();

  // Fetch notes with images
  const { data: serverNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: equipmentQueryKeys.notesWithImages(equipmentId),
    queryFn: () => getEquipmentNotesWithImages(equipmentId),
    enabled: !!equipmentId
  });

  // Merge server notes with any pending offline note items
  const notes = useOfflineMergedNotes(serverNotes, 'equipment', equipmentId);

  // Fetch images for gallery
  const { data: images = [] } = useQuery({
    queryKey: equipmentQueryKeys.images(equipmentId),
    queryFn: () => getEquipmentImages(equipmentId),
    enabled: !!equipmentId
  });

  // Create note mutation — supports offline (text only; images when online)
  const createNoteMutation = useMutation({
    mutationFn: async ({ content, hoursWorked, isPrivate, images, machineHours }: {
      content: string;
      hoursWorked: number;
      isPrivate: boolean;
      images: File[];
      machineHours?: number;
    }) => {
      if (!activeOrganizationId) {
        throw new Error('No active organization selected');
      }
      const orgId = activeOrganizationId;

      if (shouldUseOfflineNotePath(images) && user?.id) {
        const service = new OfflineAwareWorkOrderService(orgId, user.id);
        const result = await service.createEquipmentNote(equipmentId, content, hoursWorked, isPrivate, machineHours);
        if (result.queuedOffline) {
          return { queuedOffline: true, hadImages: images.length > 0 };
        }
        return { queuedOffline: false, data: result.data };
      }
      return createEquipmentNoteWithImages(
        equipmentId,
        content,
        hoursWorked,
        isPrivate,
        images,
        orgId,
        machineHours,
      );
    },
    onSuccess: (result) => {
      handleNoteCreateMutationSuccess(result, {
        onQueuedOffline: (hadImages) => {
          showQueuedNoteCreateToasts(hadImages, { combinedOfflineMessage: true });
          offlineCtx?.refresh();
        },
        onOnlineSuccess: () => {
          queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.notesWithImages(equipmentId) });
          queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.images(equipmentId) });
          toast.success('Note created successfully');
        },
        resetForm: () => {
          setShowForm(false);
          setNoteContent('');
          setAttachedImages([]);
        },
      });
    },
    onError: (error) => {
      logger.error('Failed to create note', error);
      toast.error('Failed to create note');
    }
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: deleteEquipmentNoteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.notesWithImages(equipmentId) });
      queryClient.invalidateQueries({ queryKey: equipmentQueryKeys.images(equipmentId) });
    }
  });

  // Set display image mutation
  const setDisplayImageMutation = useMutation({
    mutationFn: (imageUrl: string) => {
      if (!permissions.canSetDisplayImage) {
        throw new Error('You do not have permission to set the equipment display image');
      }
      if (!activeOrganizationId) {
        throw new Error('No active organization selected');
      }
      return updateEquipmentDisplayImage(activeOrganizationId, equipmentId, imageUrl);
    },
    onSuccess: () => {
      // Invalidate the canonical equipment cache root so both the by-id query
      // (`['equipment', orgId, equipmentId]`) and the lightweight summaries
      // query pick up the new display image.
      if (activeOrganizationId) {
        queryClient.invalidateQueries({ queryKey: ['equipment', activeOrganizationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
      }
    }
  });

  const handleNoteSubmit = async (data: NoteSubmitPayload) => {
    const userName = user?.email?.split('@')[0] || 'User';
    const finalContent = resolveNoteContentFromSubmit(data, userName, 'count');

    await createNoteMutation.mutateAsync({
      content: finalContent,
      hoursWorked: data.hoursWorked || 0,
      isPrivate: data.isPrivate || false,
      images: data.images,
      machineHours: data.machineHours
    });
  };

  const handleImagesAdd = (files: File[]) => {
    setAttachedImages(prev => [...prev, ...files]);
  };

  const handleImageRemove = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const canDeleteImage = (image: { uploaded_by: string }) => {
    return image.uploaded_by === user?.id;
  };

  // Derive user display name for clipboard paste fallback
  const userDisplayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  if (notesLoading) {
    return <NotesLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Add Note Form - Always show if no notes exist */}
      {(notes.length === 0 || showForm) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{notes.length === 0 ? 'Add Your First Note' : 'Add Note'}</span>
              {notes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setNoteContent('');
                    setAttachedImages([]);
                  }}
                >
                  Cancel
                </Button>
              )}
            </CardTitle>
            <OfflineFormBanner />
          </CardHeader>
          <CardContent>
            <InlineNoteComposer
              value={noteContent}
              onChange={setNoteContent}
              onSubmit={handleNoteSubmit}
              attachedImages={attachedImages}
              onImagesAdd={handleImagesAdd}
              onImageRemove={handleImageRemove}
              showPrivateToggle={true}
              showHoursWorked={true}
              showMachineHours={true}
              disabled={createNoteMutation.isPending}
              isSubmitting={createNoteMutation.isPending}
              placeholder="Enter your note..."
              userDisplayName={userDisplayName}
            />
          </CardContent>
        </Card>
      )}

      {/* Add Note Button - Only show if notes exist and form is not shown */}
      {notes.length > 0 && !showForm && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteTimelineEntry
            key={note.id}
            note={{
              ...note,
              _isPendingSync: (note as { _isPendingSync?: boolean })._isPendingSync,
            }}
            formatDate={formatNoteDate}
          />
        ))}
      </div>

      {/* Images Section */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              Equipment Images ({images.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={images.filter(img => !img.is_private_note || img.uploaded_by === user?.id)}
              onDelete={deleteImageMutation.mutateAsync}
              onSetDisplayImage={setDisplayImageMutation.mutateAsync}
              canDelete={canDeleteImage}
              canSetDisplayImage={permissions.canSetDisplayImage}
              currentDisplayImage={currentDisplayImage ?? undefined}
              title=""
              emptyMessage="No images uploaded yet."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EquipmentNotesTab;

