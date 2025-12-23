
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getWorkOrderImages, deleteWorkOrderImage } from '@/features/work-orders/services/workOrderNotesService';
import ImageGallery from '@/components/common/ImageGallery';

interface WorkOrderImagesSectionProps {
  workOrderId: string;
  canUpload: boolean;
}

const WorkOrderImagesSection: React.FC<WorkOrderImagesSectionProps> = ({
  workOrderId,
  canUpload
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch images
  const { data: images = [], isLoading } = useQuery({
    queryKey: ['work-order-images', workOrderId],
    queryFn: () => getWorkOrderImages(workOrderId),
    enabled: !!workOrderId
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: deleteWorkOrderImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-images', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-order-notes-with-images', workOrderId] });
    }
  });

  const canDeleteImage = (image: { uploaded_by: string }) => {
    return image.uploaded_by === user?.id;
  };

  // Filter out private note images if user shouldn't see them
  const visibleImages = images.filter(img => {
    if (!img.is_private_note) return true;
    return img.uploaded_by === user?.id;
  });

  if (isLoading) {
    return (
      <div className="h-64 bg-muted animate-pulse rounded" />
    );
  }

  // Don't show the images section if there are no images
  // Images can be added through notes now
  if (visibleImages.length === 0) {
    return null;
  }

  return (
    <ImageGallery
      images={visibleImages}
      onDelete={deleteImageMutation.mutateAsync}
      canDelete={canDeleteImage}
      title="Work Order Images"
      emptyMessage={
        canUpload 
          ? "No images uploaded yet. Add a note with images to get started."
          : "No images have been uploaded for this work order yet."
      }
    />
  );
};

export default WorkOrderImagesSection;
