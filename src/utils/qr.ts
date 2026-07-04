/**
 * Shared QR code utilities for URL construction and data-URL generation.
 *
 * Centralises route patterns and QR rendering so PDF generators, UI dialogs,
 * and redirect handlers all agree on the same URL shapes.
 */

// ── Route path builders (relative, no origin) ──

/**
 * Build the relative path for an equipment QR code.
 *
 * When `orgId` is provided the path includes a `?org=` query parameter so the
 * QR scan landing page (`EquipmentQRScan`) can perform a single-org lookup
 * rather than a cross-org membership scan.  Callers that do not know the org
 * at generation time (e.g. PDF generators) may omit it; the landing page falls
 * back to a multi-org lookup for backward compatibility.
 */
export function equipmentQRPath(equipmentId: string, orgId?: string): string {
  const base = `/qr/equipment/${equipmentId}`;
  return orgId ? `${base}?org=${encodeURIComponent(orgId)}` : base;
}

export function inventoryQRPath(itemId: string): string {
  return `/qr/inventory/${itemId}`;
}

export function workOrderQRPath(workOrderId: string): string {
  return `/qr/work-order/${workOrderId}`;
}

/** Public operator daily check-in QR (token-based, non-enumerable). */
export function operatorCheckInQRPath(token: string): string {
  return `/qr/operator-check-in/${encodeURIComponent(token)}`;
}

/** Origins accepted when decoding printed stickers against a different dev host. */
const EQUIPQR_QR_ORIGINS = new Set([
  'https://equipqr.app',
  'https://www.equipqr.app',
  'https://preview.equipqr.app',
]);

const RESERVED_QR_FIRST_SEGMENTS = new Set(['equipment', 'inventory', 'work-order', 'operator-check-in']);

export type ParseEquipQRTargetResult =
  | { ok: true; kind: 'equipment'; equipmentId: string; path: string; orgId?: string }
  | { ok: true; kind: 'inventory'; itemId: string; path: string }
  | { ok: true; kind: 'workOrder'; workOrderId: string; path: string }
  | { ok: true; kind: 'operatorCheckIn'; token: string; path: string }
  | {
      ok: false;
      reason: 'empty' | 'malformed' | 'external' | 'unsupported';
      message: string;
    };

/**
 * Parse QR decode results into EquipQR routes. Accepts relative paths and
 * absolute URLs on the current origin or known EquipQR production/preview hosts.
 */
export function parseEquipQRTarget(
  rawValue: string,
  currentOrigin: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'
): ParseEquipQRTargetResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty', message: 'No QR content.' };
  }

  let url: URL;
  try {
    url = new URL(trimmed, currentOrigin);
  } catch {
    return { ok: false, reason: 'malformed', message: 'Could not read this QR link.' };
  }

  let baseOrigin: string;
  try {
    baseOrigin = new URL(currentOrigin).origin;
  } catch {
    return { ok: false, reason: 'malformed', message: 'Could not read this QR link.' };
  }

  const originAllowed = url.origin === baseOrigin || EQUIPQR_QR_ORIGINS.has(url.origin);

  if (!originAllowed) {
    return { ok: false, reason: 'external', message: 'This QR code is not an EquipQR link.' };
  }

  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] !== 'qr') {
    return { ok: false, reason: 'unsupported', message: 'Unsupported EquipQR link.' };
  }

  const second = segments[1];
  const third = segments[2];

  if (second === 'equipment' && third) {
    const equipmentId = encodeURIComponent(third);
    const orgId = url.searchParams.get('org') ?? undefined;
    const path = orgId
      ? `/qr/equipment/${equipmentId}?org=${encodeURIComponent(orgId)}`
      : `/qr/equipment/${equipmentId}`;
    return { ok: true, kind: 'equipment', equipmentId: third, path, orgId };
  }

  if (second === 'inventory' && third) {
    return { ok: true, kind: 'inventory', itemId: third, path: `/qr/inventory/${encodeURIComponent(third)}` };
  }

  if (second === 'work-order' && third) {
    return { ok: true, kind: 'workOrder', workOrderId: third, path: `/qr/work-order/${encodeURIComponent(third)}` };
  }

  if (second === 'operator-check-in' && third) {
    return {
      ok: true,
      kind: 'operatorCheckIn',
      token: decodeURIComponent(third),
      path: `/qr/operator-check-in/${encodeURIComponent(third)}`,
    };
  }

  // Legacy `/qr/:equipmentId` (must not shadow reserved multi-segment routes)
  if (segments.length === 2 && second && !RESERVED_QR_FIRST_SEGMENTS.has(second)) {
    const equipmentId = second;
    const encodedEquipmentId = encodeURIComponent(equipmentId);
    const orgId = url.searchParams.get('org') ?? undefined;
    const path = orgId
      ? `/qr/equipment/${encodedEquipmentId}?org=${encodeURIComponent(orgId)}`
      : `/qr/equipment/${encodedEquipmentId}`;
    return { ok: true, kind: 'equipment', equipmentId, path, orgId };
  }

  return { ok: false, reason: 'unsupported', message: 'Unsupported EquipQR link.' };
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
