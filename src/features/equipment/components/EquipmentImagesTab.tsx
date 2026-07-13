import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEquipmentNotesPermissions } from '@/features/equipment/hooks/useEquipmentNotesPermissions';
import { useEquipmentMediaLibrary } from '@/features/equipment/hooks/useEquipmentMediaLibrary';
import ImageGallery from '@/components/common/ImageGallery';
import ImageUploadWithNote from '@/components/common/ImageUploadWithNote';
import { EquipmentMediaFiltersBar } from '@/features/equipment/components/media/EquipmentMediaFiltersBar';
import { EquipmentMediaExplorer } from '@/features/equipment/components/media/EquipmentMediaExplorer';
import {
  deleteEquipmentImage,
  updateEquipmentDisplayImage,
  type EquipmentImageData,
} from '@/features/equipment/services/equipmentImagesService';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import { equipment } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Images, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface EquipmentImagesTabProps {
  equipmentId: string;
  organizationId: string;
  equipmentTeamId?: string;
  currentDisplayImage?: string;
  equipmentName?: string;
}

const EquipmentImagesTab: React.FC<EquipmentImagesTabProps> = ({
  equipmentId,
  organizationId,
  equipmentTeamId,
  currentDisplayImage,
  equipmentName = 'Equipment',
}) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const permissions = useEquipmentNotesPermissions(equipmentTeamId);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [optionalNote, setOptionalNote] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(false);

  const media = useEquipmentMediaLibrary({
    equipmentId,
    organizationId,
    currentDisplayImage,
  });

  const invalidateMedia = () => {
    queryClient.invalidateQueries({ queryKey: equipment.images(equipmentId) });
    queryClient.invalidateQueries({ queryKey: equipment.notesWithImages(equipmentId) });
    queryClient.invalidateQueries({ queryKey: equipment.list(organizationId) });
    queryClient.invalidateQueries({
      queryKey: equipment.byId(organizationId, equipmentId),
    });
  };

  const deleteImageMutation = useMutation({
    mutationFn: ({
      imageId,
      sourceType,
      workOrderId,
    }: {
      imageId: string;
      sourceType: 'equipment_note' | 'work_order_note';
      workOrderId?: string;
    }) =>
      deleteEquipmentImage({
        imageId,
        sourceType,
        organizationId,
        equipmentId,
        workOrderId,
      }),
    onSuccess: () => {
      invalidateMedia();
      toast.success('Image deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    },
  });

  const setDisplayImageMutation = useMutation({
    mutationFn: (imageUrl: string) => {
      if (!permissions.canSetDisplayImage) {
        throw new Error('You do not have permission to set the equipment display image');
      }
      return updateEquipmentDisplayImage(organizationId, equipmentId, imageUrl);
    },
    onSuccess: () => {
      invalidateMedia();
      toast.success('Display image updated successfully');
    },
    onError: (error) => {
      console.error('Error setting display image:', error);
      toast.error('Failed to update display image');
    },
  });

  const uploadImagesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const userName = user?.email?.split('@')[0] || 'User';
      const trimmedNote = optionalNote.trim();
      const noteContent =
        trimmedNote ||
        (files.length === 1
          ? `${userName} uploaded an image`
          : `${userName} uploaded ${files.length} images`);

      return createEquipmentNoteWithImages(
        equipmentId,
        noteContent,
        0,
        false,
        files,
        organizationId,
      );
    },
    onSuccess: () => {
      invalidateMedia();
      setShowUploadForm(false);
      setOptionalNote('');
    },
    onError: (error) => {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    },
  });

  const canDeleteImage = (image: EquipmentImageData): boolean => {
    if (image.uploaded_by === user?.id) return true;
    return permissions.canDeleteImages;
  };

  const handleDeleteImage = async (imageId: string) => {
    const image = media.images.find((img) => img.id === imageId);
    if (!image) return;
    await deleteImageMutation.mutateAsync({
      imageId,
      sourceType: image.source_type,
      workOrderId: image.source_type === 'work_order_note' ? image.source_id : undefined,
    });
  };

  if (media.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Media library</h2>
          <p className="text-xs text-muted-foreground">
            {media.images.length} item{media.images.length === 1 ? '' : 's'} from notes and work
            orders
            {currentOrganization?.name ? ` · ${currentOrganization.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setExplorerOpen(true)}
          >
            <Images className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Open explorer
          </Button>
          {permissions.canUploadImages && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowUploadForm((open) => !open)}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {showUploadForm ? 'Cancel' : 'Upload'}
            </Button>
          )}
        </div>
      </div>

      <EquipmentMediaFiltersBar
        filters={media.filters}
        activeFilterCount={media.activeFilterCount}
        onSearchChange={media.setSearch}
        onSourceChange={media.setSource}
        onUploaderChange={media.setUploader}
        onDateFromChange={media.setDateFrom}
        onDateToChange={media.setDateTo}
        onSortChange={media.setSort}
        onClear={media.clearFilters}
      />

      {showUploadForm && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="media-upload-note" className="text-xs">
              Optional note (leave blank for auto caption)
            </Label>
            <Input
              id="media-upload-note"
              value={optionalNote}
              onChange={(e) => setOptionalNote(e.target.value)}
              placeholder="Context for these photos…"
              className="h-8"
            />
          </div>
          <ImageUploadWithNote
            onUpload={async (files) => {
              await uploadImagesMutation.mutateAsync(files);
            }}
            disabled={uploadImagesMutation.isPending}
          />
        </div>
      )}

      <ImageGallery
        images={media.filteredImages}
        onDelete={handleDeleteImage}
        onSetDisplayImage={async (imageUrl) => {
          await setDisplayImageMutation.mutateAsync(imageUrl);
        }}
        canDelete={canDeleteImage}
        canSetDisplayImage={permissions.canSetDisplayImage}
        currentDisplayImage={currentDisplayImage}
        title=""
        emptyMessage={
          media.hasActiveFilters
            ? 'No media match the current filters.'
            : 'No images found for this equipment. Upload images above, or add them through equipment notes and work orders.'
        }
      />

      <EquipmentMediaExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        equipmentName={equipmentName}
        images={media.images}
        filteredImages={media.filteredImages}
        filters={media.filters}
        activeFilterCount={media.activeFilterCount}
        isLoading={media.isLoading}
        currentDisplayImage={currentDisplayImage}
        canSetDisplayImage={permissions.canSetDisplayImage}
        onSearchChange={media.setSearch}
        onSourceChange={media.setSource}
        onUploaderChange={media.setUploader}
        onDateFromChange={media.setDateFrom}
        onDateToChange={media.setDateTo}
        onSortChange={media.setSort}
        onClearFilters={media.clearFilters}
        onSetDisplayImage={async (imageUrl) => {
          await setDisplayImageMutation.mutateAsync(imageUrl);
        }}
      />
    </div>
  );
};

export default EquipmentImagesTab;
