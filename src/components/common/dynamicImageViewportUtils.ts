import { downloadBlob } from '@/utils/exportUtils';

export interface PanPosition {
  x: number;
  y: number;
}

/** Map pointer coordinates within a container to object-position percentages (0–100). */
export function calculatePanPosition(
  pointerX: number,
  pointerY: number,
  containerWidth: number,
  containerHeight: number,
): PanPosition {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 50, y: 50 };
  }
  const x = (pointerX / containerWidth) * 100;
  const y = (pointerY / containerHeight) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

/** True when the image overflows the container in cover mode and panning adds value. */
export function imageSupportsPanning(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
): boolean {
  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return false;
  }
  const imageAspect = naturalWidth / naturalHeight;
  const containerAspect = containerWidth / containerHeight;
  return Math.abs(imageAspect - containerAspect) > 0.05;
}

/** Fetch image bytes for download/copy (works with signed cross-origin storage URLs). */
export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Fetched image is empty');
  }
  return blob;
}

export function ensureImageFileName(fileName: string, mimeType: string): string {
  const trimmed = fileName.trim() || 'image';
  if (/\.[a-z0-9]{2,5}$/i.test(trimmed)) {
    return trimmed;
  }
  const subtype = mimeType.split('/')[1]?.split('+')[0] || 'png';
  return `${trimmed}.${subtype}`;
}

export async function copyImageToClipboard(imageUrl: string, fileName: string): Promise<void> {
  const blob = await fetchImageBlob(imageUrl);
  const type = blob.type.startsWith('image/') ? blob.type : 'image/png';
  const clipboardBlob = blob.type.startsWith('image/') ? blob : new Blob([blob], { type });
  const clipboardItem = new ClipboardItem({
    [clipboardBlob.type]: clipboardBlob,
  });
  await navigator.clipboard.write([clipboardItem]);
}

export async function downloadImageFile(imageUrl: string, fileName: string): Promise<void> {
  const blob = await fetchImageBlob(imageUrl);
  downloadBlob(blob, ensureImageFileName(fileName, blob.type || 'image/png'));
}
