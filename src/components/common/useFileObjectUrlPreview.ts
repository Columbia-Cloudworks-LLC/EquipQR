import { useEffect, useState } from 'react';

/** Object-URL preview for a single File with automatic revoke on change/unmount. */
export function useFileObjectUrlPreview(file: File): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return previewUrl;
}
