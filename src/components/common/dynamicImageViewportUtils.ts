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

export async function copyImageToClipboard(imageUrl: string, fileName: string): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const type = blob.type || 'image/png';
  const clipboardItem = new ClipboardItem({
    [type]: new File([blob], fileName, { type }),
  });
  await navigator.clipboard.write([clipboardItem]);
}

export function downloadImageFile(imageUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
