import { useCallback, useState } from 'react';
import ImageLightboxDialog, {
  type ImageLightboxImage,
} from '@/components/common/ImageLightboxDialog';

export function useImageLightbox() {
  const [image, setImage] = useState<ImageLightboxImage | null>(null);

  const openImage = useCallback((next: ImageLightboxImage) => {
    setImage(next);
  }, []);

  const closeImage = useCallback(() => {
    setImage(null);
  }, []);

  const lightbox = (
    <ImageLightboxDialog
      open={image !== null}
      onOpenChange={(open) => {
        if (!open) {
          closeImage();
        }
      }}
      image={image}
    />
  );

  return { openImage, closeImage, lightbox };
}
