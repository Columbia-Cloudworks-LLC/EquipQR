import { useEffect, useRef } from 'react';
import { sanitizeBlobUrl } from '@/utils/sanitizeBlobUrl';

/**
 * Blob preview URL map for local File selections (create/upload UIs).
 * Callers own File[] state; this owns object-URL lifecycle.
 */
export function useLocalFilePreviewUrls() {
  const previewUrls = useRef<Map<File, string>>(new Map());

  const getPreviewUrl = (file: File): string | null => {
    const cached = previewUrls.current.get(file);
    if (cached) return sanitizeBlobUrl(cached);

    const url = URL.createObjectURL(file);
    const safe = sanitizeBlobUrl(url);
    if (!safe) {
      URL.revokeObjectURL(url);
      return null;
    }
    previewUrls.current.set(file, url);
    return safe;
  };

  const revokePreviewUrl = (file: File) => {
    const url = previewUrls.current.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrls.current.delete(file);
    }
  };

  const clearPreviewUrls = () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  };

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return { getPreviewUrl, revokePreviewUrl, clearPreviewUrls };
}
