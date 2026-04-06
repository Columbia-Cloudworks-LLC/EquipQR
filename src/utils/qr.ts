/**
 * Shared QR code utilities for URL construction and data-URL generation.
 *
 * Centralises route patterns and QR rendering so PDF generators, UI dialogs,
 * and redirect handlers all agree on the same URL shapes.
 */

// ── Route path builders (relative, no origin) ──

export function equipmentQRPath(equipmentId: string): string {
  return `/qr/equipment/${equipmentId}`;
}

export function inventoryQRPath(itemId: string): string {
  return `/qr/inventory/${itemId}`;
}

export function workOrderQRPath(workOrderId: string): string {
  return `/qr/work-order/${workOrderId}`;
}

// ── Full-URL builder ──

export function qrFullUrl(relativePath: string): string {
  return `${window.location.origin}${relativePath}`;
}

// ── QR data-URL generation (for embedding in PDFs / images) ──

export interface QRAsset {
  targetUrl: string;
  dataUrl: string;
}

const QR_OPTIONS = {
  width: 256,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
} as const;

export async function generateQRDataUrl(targetUrl: string): Promise<string> {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(targetUrl, QR_OPTIONS);
}

export async function buildQRAsset(targetUrl: string): Promise<QRAsset> {
  const dataUrl = await generateQRDataUrl(targetUrl);
  return { targetUrl, dataUrl };
}
