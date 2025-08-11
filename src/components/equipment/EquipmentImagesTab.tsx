import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useEquipmentNotesPermissions } from '@/hooks/useEquipmentNotesPermissions';
import ImageGallery from '@/components/common/ImageGallery';
import { 
  getAllEquipmentImages, 
  deleteEquipmentImage, 
  updateEquipmentDisplayImage,
  EquipmentImageData 
} from '@/services/equipmentImagesService';
import { toast } from 'sonner';

interface EquipmentImagesTabProps {
  equipmentId: string;
  organizationId: string;
  equipmentTeamId?: string;
  currentDisplayImage?: string;
}

const EquipmentImagesTab: React.FC<EquipmentImagesTabProps> = ({
  equipmentId,
  organizationId,
  equipmentTeamId,
  currentDisplayImage
}) => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useSimpleOrganization();
  const { user } = useAuth();
  const permissions = useEquipmentNotesPermissions(equipmentTeamId);

  // Get user's role and team information
  const userRole = currentOrganization?.userRole || 'member';
  
  const userTeamIds: string[] = []; // This would need to be fetched from team membership data

  // Fetch all equipment images
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['equipment-images', equipmentId, organizationId],
    queryFn: () => getAllEquipmentImages(equipmentId, organizationId, userRole, userTeamIds),
    enabled: !!equipmentId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: ({ imageId, sourceType }: { imageId: string; sourceType: 'equipment_note' | 'work_order_note' }) =>
      deleteEquipmentImage(imageId, sourceType),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment-images', equipmentId]
      });
      queryClient.invalidateQueries({
        queryKey: ['equipment-notes', equipmentId]
      });
      queryClient.invalidateQueries({
        queryKey: ['equipment']
      });
      toast.success('Image deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  });

  // Set display image mutation
  const setDisplayImageMutation = useMutation({
    mutationFn: (imageUrl: string) => updateEquipmentDisplayImage(equipmentId, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['equipment']
      });
      toast.success('Display image updated successfully');
    },
    onError: (error) => {
      console.error('Error setting display image:', error);
      toast.error('Failed to update display image');
    }
  });

  // Check if user can delete a specific image
  const canDeleteImage = (image: EquipmentImageData): boolean => {
    // Users can delete their own images
    if (image.uploaded_by === user?.id) {
      return true;
    }
    
    // Admins and managers can delete any image
    return permissions.canDeleteImages;
  };

  // Handle image deletion
  const handleDeleteImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;
    
    await deleteImageMutation.mutateAsync({
      imageId,
      sourceType: image.source_type
    });
  };

  // Handle setting display image
  const handleSetDisplayImage = async (imageUrl: string) => {
    await setDisplayImageMutation.mutateAsync(imageUrl);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ImageGallery
      images={images}
      onDelete={handleDeleteImage}
      onSetDisplayImage={handleSetDisplayImage}
      canDelete={canDeleteImage}
      canSetDisplayImage={permissions.canSetDisplayImage}
      currentDisplayImage={currentDisplayImage}
      title="Equipment Images"
      emptyMessage="No images found for this equipment. Images from equipment notes and work orders will appear here."
    />
  );
};

export default EquipmentImagesTab;