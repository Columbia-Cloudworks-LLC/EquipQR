import { useCallback, useState } from 'react';

export function useAttachedNoteImages(options?: {
  onAddWhileOffline?: () => void;
}) {
  const [attachedImages, setAttachedImages] = useState<File[]>([]);

  const handleImagesAdd = useCallback(
    (files: File[]) => {
      if (!navigator.onLine) {
        options?.onAddWhileOffline?.();
        return;
      }
      setAttachedImages((prev) => [...prev, ...files]);
    },
    [options],
  );

  const handleImageRemove = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachedImages = useCallback(() => {
    setAttachedImages([]);
  }, []);

  return {
    attachedImages,
    setAttachedImages,
    handleImagesAdd,
    handleImageRemove,
    clearAttachedImages,
  };
}
