import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthClaims: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/authClaims', () => ({
  getAuthClaims: (...args: unknown[]) => mocks.getAuthClaims(...args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mocks.from(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

import {
  recordScanFollowUpEvent,
  getScanFollowUpEventsByEquipmentId,
} from '@/features/equipment/services/scanFollowUpEventService';

function mockEquipmentLookup(found = true) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: found ? { id: 'eq-1' } : null,
    error: null,
  });
  const eqOrg = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqOrg }));
  const select = vi.fn(() => ({ eq: eqId }));
  return { select, eqId, eqOrg, maybeSingle };
}

function mockEventInsert(result: { data?: { id: string } | null; error?: { message: string } | null }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, single };
}

describe('recordScanFollowUpEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives performed_by from auth claims and inserts the event', async () => {
    mocks.getAuthClaims.mockResolvedValue({ sub: 'user-1' });
    const equipmentLookup = mockEquipmentLookup();
    const eventInsert = mockEventInsert({ data: { id: 'evt-1' }, error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === 'equipment') return equipmentLookup;
      if (table === 'scan_follow_up_events') return eventInsert;
      throw new Error(`Unexpected table: ${table}`);
    });

    const id = await recordScanFollowUpEvent({
      organizationId: 'org-1',
      scanId: 'scan-1',
      equipmentId: 'eq-1',
      eventType: 'generic_work_order_created',
      entityType: 'work_order',
      entityId: 'wo-1',
      metadata: { title: 'Fix it' },
    });

    expect(id).toBe('evt-1');
    expect(equipmentLookup.eqId).toHaveBeenCalledWith('id', 'eq-1');
    expect(equipmentLookup.eqOrg).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(eventInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        scan_id: 'scan-1',
        equipment_id: 'eq-1',
        event_type: 'generic_work_order_created',
        entity_type: 'work_order',
        entity_id: 'wo-1',
        performed_by: 'user-1',
      })
    );
  });

  it('throws when equipment is not in the organization', async () => {
    mocks.getAuthClaims.mockResolvedValue({ sub: 'user-1' });
    const equipmentLookup = mockEquipmentLookup(false);

    mocks.from.mockImplementation((table: string) => {
      if (table === 'equipment') return equipmentLookup;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      recordScanFollowUpEvent({
        organizationId: 'org-1',
        scanId: 'scan-1',
        equipmentId: 'eq-1',
        eventType: 'dashboard_opened',
      })
    ).rejects.toThrow(/not found in organization/i);
  });

  it('throws when the user is not authenticated', async () => {
    mocks.getAuthClaims.mockResolvedValue(null);

    await expect(
      recordScanFollowUpEvent({
        organizationId: 'org-1',
        scanId: 'scan-1',
        equipmentId: 'eq-1',
        eventType: 'dashboard_opened',
      })
    ).rejects.toThrow(/not authenticated/i);
  });

  it('throws when the insert returns an error', async () => {
    mocks.getAuthClaims.mockResolvedValue({ sub: 'user-1' });
    const equipmentLookup = mockEquipmentLookup();
    const eventInsert = mockEventInsert({ data: null, error: { message: 'insert denied' } });

    mocks.from.mockImplementation((table: string) => {
      if (table === 'equipment') return equipmentLookup;
      if (table === 'scan_follow_up_events') return eventInsert;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      recordScanFollowUpEvent({
        organizationId: 'org-1',
        scanId: 'scan-1',
        equipmentId: 'eq-1',
        eventType: 'dashboard_opened',
      })
    ).rejects.toThrow(/insert denied/i);
  });
});

describe('getScanFollowUpEventsByEquipmentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries org-scoped events and resolves the performer name', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'evt-1',
          scan_id: 'scan-1',
          equipment_id: 'eq-1',
          event_type: 'note_image_added',
          entity_type: 'note',
          entity_id: null,
          metadata: {},
          performed_by: 'user-1',
          performed_by_name: null,
          performed_at: '2026-01-02T00:00:00Z',
          performed_by_profile: { id: 'user-1', name: 'Jane Tech' },
        },
      ],
      error: null,
    });
    const eqOrg = vi.fn(() => ({ order }));
    const eqEquipment = vi.fn(() => ({ eq: eqOrg }));
    const select = vi.fn(() => ({ eq: eqEquipment }));
    mocks.from.mockReturnValue({ select });

    const result = await getScanFollowUpEventsByEquipmentId('org-1', 'eq-1');

    expect(eqEquipment).toHaveBeenCalledWith('equipment_id', 'eq-1');
    expect(eqOrg).toHaveBeenCalledWith('equipment.organization_id', 'org-1');
    expect(order).toHaveBeenCalledWith('performed_at', { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0].performedByName).toBe('Jane Tech');
  });

  it('throws when the query returns an error', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'select failed' } });
    const eqOrg = vi.fn(() => ({ order }));
    const eqEquipment = vi.fn(() => ({ eq: eqOrg }));
    const select = vi.fn(() => ({ eq: eqEquipment }));
    mocks.from.mockReturnValue({ select });

    await expect(getScanFollowUpEventsByEquipmentId('org-1', 'eq-1')).rejects.toThrow(/select failed/i);
  });
});
