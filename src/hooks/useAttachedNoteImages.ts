import { useCallback, useState } from 'react';

export function useAttachedNoteImages(_options?: {
  onAddWhileOffline?: () => void;
}) {
  const [attachedImages, setAttachedImages] = useState<File[]>([]);

  const handleImagesAdd = useCallback(
    (files: File[]) => {
      setAttachedImages((prev) => [...prev, ...files]);
    },
    [],
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
