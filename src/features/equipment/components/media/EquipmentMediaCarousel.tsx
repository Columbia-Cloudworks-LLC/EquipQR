import React, { useMemo } from 'react';
import { Forklift } from 'lucide-react';
import NoteImageCarousel, {
  type NoteCarouselImage,
} from '@/components/common/NoteImageCarousel';
import type { EquipmentImageData } from '@/features/equipment/services/equipmentImagesService';
import { cn } from '@/lib/utils';

export interface EquipmentMediaCarouselProps {
  images: EquipmentImageData[];
  equipmentName: string;
  className?: string;
  emptyClassName?: string;
  onImageClick?: (image: NoteCarouselImage) => void;
}

/**
 * Primary equipment image surface for pre-ordered equipment media.
 * Reuses NoteImageCarousel / DynamicImageViewport (PR #1200).
 */
export function EquipmentMediaCarousel({
  images,
  equipmentName,
  className,
  emptyClassName,
  onImageClick,
}: EquipmentMediaCarouselProps) {
  const carouselImages: NoteCarouselImage[] = useMemo(
    () =>
      images.map((image) => ({
        id: image.id,
        file_url: image.file_url,
        file_name: image.file_name || `${equipmentName} photo`,
      })),
    [images, equipmentName],
  );

  if (carouselImages.length === 0) {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center rounded-lg bg-muted',
          emptyClassName ?? 'h-64',
          className,
        )}
        role="img"
        aria-label={`${equipmentName} has no photos yet`}
      >
        <Forklift className="h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" aria-hidden />
      </div>
    );
  }

  return (
    <NoteImageCarousel
      images={carouselImages}
      className={className}
      onImageClick={onImageClick}
    />
  );
}
