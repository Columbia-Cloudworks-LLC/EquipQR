import { useCallback, useState } from 'react';

export function useAttachedNoteImages(options?: {
  onAddWhileOffline?: () => void;
}) {
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const onAddWhileOffline = options?.onAddWhileOffline;

  const handleImagesAdd = useCallback(
    (files: File[]) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        onAddWhileOffline?.();
        return;
      }
      setAttachedImages((prev) => [...prev, ...files]);
    },
    [onAddWhileOffline],
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
