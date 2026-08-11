import { describe, it, expect } from 'vitest';
import type { EquipmentScan } from '@/features/equipment/services/EquipmentService';
import type { ScanFollowUpEvent } from '@/features/equipment/services/scanFollowUpEventService';
import {
  buildScanHistoryTimeline,
  describeScanFollowUpEvent,
} from '@/features/equipment/utils/scanHistoryTimeline';

function scan(overrides: Partial<EquipmentScan> & { id: string; scanned_at: string }): EquipmentScan {
  return {
    id: overrides.id,
    equipment_id: overrides.equipment_id ?? 'eq-1',
    scanned_by: overrides.scanned_by ?? 'user-1',
    scanned_at: overrides.scanned_at,
    location: overrides.location ?? null,
    notes: overrides.notes ?? null,
    scanned_by_name: overrides.scanned_by_name ?? null,
    scannedByName: overrides.scannedByName,
  } as EquipmentScan;
}

function followUp(
  overrides: Partial<ScanFollowUpEvent> & {
    id: string;
    scan_id: string;
    event_type: string;
    performed_at: string;
  }
): ScanFollowUpEvent {
  return {
    id: overrides.id,
    scan_id: overrides.scan_id,
    equipment_id: overrides.equipment_id ?? 'eq-1',
    event_type: overrides.event_type,
    entity_type: overrides.entity_type ?? null,
    entity_id: overrides.entity_id ?? null,
    metadata: overrides.metadata ?? {},
    performed_by: overrides.performed_by ?? 'user-1',
    performed_by_name: overrides.performed_by_name ?? null,
    performed_at: overrides.performed_at,
    performedByName: overrides.performedByName,
  } as ScanFollowUpEvent;
}

describe('buildScanHistoryTimeline', () => {
  it('sorts scans newest first', () => {
    const scans = [
      scan({ id: 'older', scanned_at: '2026-01-01T00:00:00Z' }),
      scan({ id: 'newer', scanned_at: '2026-01-02T00:00:00Z' }),
    ];

    const timeline = buildScanHistoryTimeline(scans, []);

    expect(timeline.map((e) => e.scan.id)).toEqual(['newer', 'older']);
  });

  it('nests follow-up actions under their scan, oldest-to-newest', () => {
    const scans = [scan({ id: 'scan-1', scanned_at: '2026-01-01T00:00:00Z' })];
    const followUps = [
      followUp({
        id: 'evt-late',
        scan_id: 'scan-1',
        event_type: 'note_image_added',
        performed_at: '2026-01-01T02:00:00Z',
      }),
      followUp({
        id: 'evt-early',
        scan_id: 'scan-1',
        event_type: 'generic_work_order_created',
        performed_at: '2026-01-01T01:00:00Z',
      }),
    ];

    const timeline = buildScanHistoryTimeline(scans, followUps);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].actions.map((a) => a.id)).toEqual(['evt-early', 'evt-late']);
  });

  it('adds a "Viewed scan page" fallback action when a scan has no follow-up events', () => {
    const scans = [
      scan({ id: 'scan-1', scanned_at: '2026-01-01T00:00:00Z', scannedByName: 'Jane' }),
    ];

    const timeline = buildScanHistoryTimeline(scans, []);

    expect(timeline[0].actions).toHaveLength(1);
    expect(timeline[0].actions[0]).toMatchObject({
      eventType: null,
      label: 'Viewed scan page',
      performedByName: 'Jane',
    });
  });

  it('ignores follow-up events whose scan_id is not among the scans', () => {
    const scans = [scan({ id: 'scan-1', scanned_at: '2026-01-01T00:00:00Z' })];
    const followUps = [
      followUp({
        id: 'orphan',
        scan_id: 'missing-scan',
        event_type: 'dashboard_opened',
        performed_at: '2026-01-01T01:00:00Z',
      }),
    ];

    const timeline = buildScanHistoryTimeline(scans, followUps);

    // The scan falls back to the synthetic action; the orphan event is dropped.
    expect(timeline[0].actions).toHaveLength(1);
    expect(timeline[0].actions[0].eventType).toBeNull();
  });
});

describe('describeScanFollowUpEvent', () => {
  it('labels dashboard_opened', () => {
    expect(describeScanFollowUpEvent({ event_type: 'dashboard_opened', metadata: {} })).toEqual({
      label: 'Opened full dashboard record',
    });
  });

  it('labels work order events with the title detail', () => {
    expect(
      describeScanFollowUpEvent({ event_type: 'pm_work_order_created', metadata: { title: 'PM 1' } })
    ).toEqual({ label: 'Created PM work order', detail: 'PM 1' });

    expect(
      describeScanFollowUpEvent({ event_type: 'generic_work_order_created', metadata: { title: 'WO 9' } })
    ).toEqual({ label: 'Created work order', detail: 'WO 9' });
  });

  it('labels working hours with the new hours value', () => {
    expect(
      describeScanFollowUpEvent({ event_type: 'working_hours_updated', metadata: { newHours: 125 } })
    ).toEqual({ label: 'Updated working hours', detail: '125 hours' });
  });

  it('labels note/image with image count and privacy detail', () => {
    expect(
      describeScanFollowUpEvent({ event_type: 'note_image_added', metadata: { imageCount: 2, isPrivate: true } })
    ).toEqual({ label: 'Added note / image', detail: '2 images, private' });

    expect(
      describeScanFollowUpEvent({ event_type: 'note_image_added', metadata: {} })
    ).toEqual({ label: 'Added note / image' });
  });
});
