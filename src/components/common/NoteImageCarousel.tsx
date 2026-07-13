import React, { useCallback } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import DynamicImageViewport from '@/components/common/DynamicImageViewport';
import { useImageLightbox } from '@/components/common/useImageLightbox';
import { cn } from '@/lib/utils';

export interface NoteCarouselImage {
  id: string;
  file_url: string;
  file_name: string;
}

interface NoteImageCarouselProps {
  images: NoteCarouselImage[];
  className?: string;
  onImageClick?: (image: NoteCarouselImage) => void;
  /** When true (default), tap opens a pinch-zoom lightbox unless onImageClick overrides. */
  enableLightbox?: boolean;
}

const NoteImageCarousel: React.FC<NoteImageCarouselProps> = ({
  images,
  className,
  onImageClick,
  enableLightbox = true,
}) => {
  const { openImage, lightbox } = useImageLightbox();

  const handleImageClick = useCallback(
    (image: NoteCarouselImage) => {
      if (onImageClick) {
        onImageClick(image);
        return;
      }
      if (!enableLightbox) return;
      openImage({
        src: image.file_url,
        alt: image.file_name,
        fileName: image.file_name,
      });
    },
    [enableLightbox, onImageClick, openImage],
  );

  if (images.length === 0) return null;

  const clickHandler = onImageClick || enableLightbox ? handleImageClick : undefined;

  if (images.length === 1) {
    const image = images[0];
    return (
      <>
        <DynamicImageViewport
          src={image.file_url}
          alt={image.file_name}
          fileName={image.file_name}
          className={cn('aspect-square w-full rounded-md sm:aspect-[4/3]', className)}
          onClick={clickHandler ? () => clickHandler(image) : undefined}
        />
        {enableLightbox && !onImageClick ? lightbox : null}
      </>
    );
  }

  return (
    <>
      <div className={cn('relative px-1 sm:px-8', className)}>
        <Carousel opts={{ loop: false }} className="w-full">
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.id}>
                <DynamicImageViewport
                  src={image.file_url}
                  alt={image.file_name}
                  fileName={image.file_name}
                  className="aspect-square w-full rounded-md sm:aspect-[4/3]"
                  onClick={clickHandler ? () => clickHandler(image) : undefined}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            type="button"
            className="left-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 border bg-background/90 shadow-sm"
            aria-label="Previous image"
          />
          <CarouselNext
            type="button"
            className="right-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 border bg-background/90 shadow-sm"
            aria-label="Next image"
          />
        </Carousel>
      </div>
      {enableLightbox && !onImageClick ? lightbox : null}
    </>
  );
};

export default NoteImageCarousel;
