import type { EquipmentScan } from '@/features/equipment/services/EquipmentService';
import type {
  ScanFollowUpEvent,
  ScanFollowUpEventType,
} from '@/features/equipment/services/scanFollowUpEventService';

/**
 * A single action shown under a scan in the Scan History timeline. `eventType`
 * is `null` for the synthetic "Viewed scan page" fallback used when a scan has
 * no recorded follow-up events.
 */
export interface ScanHistoryAction {
  id: string;
  eventType: ScanFollowUpEventType | null;
  label: string;
  detail?: string;
  performedByName?: string;
  performedAt: string;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * One scan plus the follow-up actions performed from it. Scans are the timeline
 * spine; actions are nested beneath their parent scan.
 */
export interface ScanHistoryEntry {
  scan: EquipmentScan;
  actions: ScanHistoryAction[];
}

function readString(metadata: unknown, key: string): string | undefined {
  if (metadata && typeof metadata === 'object' && key in metadata) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
}

function readNumber(metadata: unknown, key: string): number | undefined {
  if (metadata && typeof metadata === 'object' && key in metadata) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function readBoolean(metadata: unknown, key: string): boolean | undefined {
  if (metadata && typeof metadata === 'object' && key in metadata) {
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

/**
 * Human-readable label (and optional detail) for a follow-up event, derived
 * from its type and minimal non-sensitive metadata.
 */
export function describeScanFollowUpEvent(
  event: Pick<ScanFollowUpEvent, 'event_type' | 'metadata'>
): { label: string; detail?: string } {
  const metadata = event.metadata;

  switch (event.event_type as ScanFollowUpEventType) {
    case 'dashboard_opened':
      return { label: 'Opened full dashboard record' };
    case 'pm_work_order_created':
      return { label: 'Created PM work order', detail: readString(metadata, 'title') };
    case 'generic_work_order_created':
      return { label: 'Created work order', detail: readString(metadata, 'title') };
    case 'working_hours_updated': {
      const hours = readNumber(metadata, 'newHours');
      return {
        label: 'Updated working hours',
        detail: hours === undefined ? undefined : `${hours} hours`,
      };
    }
    case 'note_image_added': {
      const imageCount = readNumber(metadata, 'imageCount');
      const isPrivate = readBoolean(metadata, 'isPrivate');
      const parts: string[] = [];
      if (imageCount !== undefined && imageCount > 0) {
        parts.push(`${imageCount} image${imageCount === 1 ? '' : 's'}`);
      }
      if (isPrivate) parts.push('private');
      return {
        label: 'Added note / image',
        detail: parts.length > 0 ? parts.join(', ') : undefined,
      };
    }
    default:
      return { label: 'Performed an action' };
  }
}

function compareDesc(aTime: string, bTime: string, aId: string, bId: string): number {
  const aMs = new Date(aTime).getTime();
  const bMs = new Date(bTime).getTime();
  if (aMs !== bMs) return bMs - aMs;
  return bId.localeCompare(aId);
}

function compareAsc(aTime: string, bTime: string, aId: string, bId: string): number {
  const aMs = new Date(aTime).getTime();
  const bMs = new Date(bTime).getTime();
  if (aMs !== bMs) return aMs - bMs;
  return aId.localeCompare(bId);
}

/**
 * Build the Scan History timeline: scans newest-first, with their follow-up
 * actions nested oldest-to-newest. Scans without follow-up events get a single
 * synthetic "Viewed scan page" action. Follow-up events whose `scan_id` does not
 * match a provided scan are ignored (scans are the spine of the timeline).
 */
export function buildScanHistoryTimeline(
  scans: EquipmentScan[],
  followUps: ScanFollowUpEvent[]
): ScanHistoryEntry[] {
  const eventsByScanId = new Map<string, ScanFollowUpEvent[]>();
  for (const event of followUps) {
    const bucket = eventsByScanId.get(event.scan_id);
    if (bucket) {
      bucket.push(event);
    } else {
      eventsByScanId.set(event.scan_id, [event]);
    }
  }

  const sortedScans = [...scans].sort((a, b) =>
    compareDesc(a.scanned_at, b.scanned_at, a.id, b.id)
  );

  return sortedScans.map((scan) => {
    const events = (eventsByScanId.get(scan.id) ?? []).slice().sort((a, b) =>
      compareAsc(a.performed_at, b.performed_at, a.id, b.id)
    );

    if (events.length === 0) {
      return {
        scan,
        actions: [
          {
            id: `${scan.id}:viewed`,
            eventType: null,
            label: 'Viewed scan page',
            performedByName: scan.scannedByName,
            performedAt: scan.scanned_at,
          },
        ],
      };
    }

    return {
      scan,
      actions: events.map((event) => {
        const { label, detail } = describeScanFollowUpEvent(event);
        return {
          id: event.id,
          eventType: event.event_type as ScanFollowUpEventType,
          label,
          detail,
          performedByName: event.performedByName,
          performedAt: event.performed_at,
          entityType: event.entity_type,
          entityId: event.entity_id,
        };
      }),
    };
  });
}
