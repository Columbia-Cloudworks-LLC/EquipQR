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

describe('recordScanFollowUpEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('derives performed_by from auth claims and inserts the event', async () => {
    mocks.getAuthClaims.mockResolvedValue({ sub: 'user-1' });
    const single = vi.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });

    const id = await recordScanFollowUpEvent({
      scanId: 'scan-1',
      equipmentId: 'eq-1',
      eventType: 'generic_work_order_created',
      entityType: 'work_order',
      entityId: 'wo-1',
      metadata: { title: 'Fix it' },
    });

    expect(id).toBe('evt-1');
    expect(mocks.from).toHaveBeenCalledWith('scan_follow_up_events');
    expect(insert).toHaveBeenCalledWith(
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

  it('throws when the user is not authenticated', async () => {
    mocks.getAuthClaims.mockResolvedValue(null);

    await expect(
      recordScanFollowUpEvent({
        scanId: 'scan-1',
        equipmentId: 'eq-1',
        eventType: 'dashboard_opened',
      })
    ).rejects.toThrow(/not authenticated/i);
  });

  it('throws when the insert returns an error', async () => {
    mocks.getAuthClaims.mockResolvedValue({ sub: 'user-1' });
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert denied' } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    mocks.from.mockReturnValue({ insert });

    await expect(
      recordScanFollowUpEvent({
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
