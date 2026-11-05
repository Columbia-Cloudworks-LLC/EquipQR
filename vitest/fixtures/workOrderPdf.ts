/**
 * Shared fixtures for work-order PDF generator tests (report + field worksheet).
 *
 * jsdom cannot decode images, so `installImageDecoder` provides an `Image`
 * that reads real PNG/JPEG headers for width/height and fails on anything
 * else — the same contract a browser offers the generators. `stubImageFetch`
 * serves fixed responses so tests never touch the network.
 */
import { vi } from 'vitest';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { WorkOrderNote } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrderPDFData } from '@/features/work-orders/services/workOrderReportPDFService';

/** 4×2 px PNG (wide). */
export const WIDE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAACXBIWXMAAAABAAAAAQBPJcTWAAAAD0lEQVR4nGNgYPiHhJA4AF9aB/FVMRRoAAAAAElFTkSuQmCC';
/** 2×8 px PNG (tall). */
export const TALL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAICAIAAABcT7kVAAAACXBIWXMAAAABAAAAAQBPJcTWAAAAD0lEQVR4nGNgqGcAIVIpAN54B/FjRpIbAAAAAElFTkSuQmCC';
/** 4×2 px baseline JPEG. */
export const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABgEBAQAAAAAAAAAAAAAAAAAABgcQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAACAAQDASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLAFF/f//Z';

export const WIDE_PNG_DATA_URL = `data:image/png;base64,${WIDE_PNG_BASE64}`;

export function base64Bytes(base64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      const marker = view.getUint16(offset);
      const length = view.getUint16(offset + 2);
      if (marker >= 0xffc0 && marker <= 0xffc2) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** Replace the global Image with one that decodes PNG/JPEG data URLs by header. */
export function installImageDecoder(): void {
  class HeaderDecodingImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(value: string) {
      const base64 = /^data:image\/[a-z]+;base64,(.*)$/i.exec(value)?.[1];
      const size = base64 ? imageSize(base64Bytes(base64)) : null;
      queueMicrotask(() => {
        if (size) {
          this.width = size.width;
          this.height = size.height;
          this.onload?.();
        } else {
          this.onerror?.();
        }
      });
    }
  }
  vi.stubGlobal('Image', HeaderDecodingImage);
}

export type FakeImageResponse =
  | { status: number; contentType?: string; bytes?: Uint8Array<ArrayBuffer> }
  | 'network-error';

/** Serve canned responses from `fetch`; unknown URLs return 404. */
export function stubImageFetch(responses: Record<string, FakeImageResponse>): string[] {
  const requested: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    requested.push(url);
    const response = responses[url] ?? { status: 404 };
    if (response === 'network-error') throw new TypeError('Failed to fetch');
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.status === 404 ? 'Not Found' : 'OK',
      blob: async () =>
        new Blob([response.bytes ?? new Uint8Array()], { type: response.contentType ?? '' }),
    };
  });
  return requested;
}

/** Make every FileReader read fail (e.g. a revoked blob). */
export function installFailingFileReader(): void {
  class FailingFileReader {
    result: string | null = null;
    onloadend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(): void {
      queueMicrotask(() => this.onerror?.());
    }
  }
  vi.stubGlobal('FileReader', FailingFileReader);
}

export const CHICAGO_SETTINGS = { timezone: 'America/Chicago', dateFormat: 'MM/dd/yyyy' } as const;

export function makeWorkOrderPdfData(overrides: Partial<WorkOrderPDFData> = {}): WorkOrderPDFData {
  return {
    workOrder: {
      id: '660e8400-e29b-41d4-a716-446655440000',
      title: 'Replace hydraulic hose',
      description: 'Hose is leaking at the boom cylinder.',
      status: 'in_progress',
      priority: 'high',
      created_date: '2026-03-01T15:00:00.000Z',
      due_date: '2026-03-11T15:00:00.000Z',
    },
    exportDateSettings: CHICAGO_SETTINGS,
    ...overrides,
  };
}

export function makePmData(overrides: Partial<PreventativeMaintenance> = {}): PreventativeMaintenance {
  return {
    id: 'pm-1',
    work_order_id: '660e8400-e29b-41d4-a716-446655440000',
    equipment_id: 'eq-1',
    organization_id: 'org-1',
    checklist_data: [],
    completed_at: null,
    completed_by: null,
    completed_by_name: null,
    created_at: '2026-03-01T15:00:00.000Z',
    created_by: 'user-1',
    created_by_name: null,
    equipment_working_hours_at_completion: null,
    historical_completion_date: null,
    historical_notes: null,
    is_historical: false,
    notes: null,
    status: 'in_progress',
    template_id: null,
    updated_at: '2026-03-01T15:00:00.000Z',
    ...overrides,
  };
}

export function makeNote(overrides: Partial<WorkOrderNote> = {}): WorkOrderNote {
  return {
    id: 'note-1',
    work_order_id: '660e8400-e29b-41d4-a716-446655440000',
    author_id: 'user-1',
    author_name: 'Avery Tech',
    content: 'Replaced the hose and bled the system.',
    hours_worked: 0,
    is_private: false,
    created_at: '2026-03-02T15:00:00.000Z',
    updated_at: '2026-03-02T15:00:00.000Z',
    ...overrides,
  };
}

export function makeNoteImage(fileName: string, fileUrl: string) {
  return {
    id: `img-${fileName}`,
    work_order_id: '660e8400-e29b-41d4-a716-446655440000',
    file_name: fileName,
    file_url: fileUrl,
    uploaded_by: 'user-1',
    created_at: '2026-03-02T15:00:00.000Z',
  };
}
