import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsert = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn(() => ({ insert: mockInsert })));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/lib/authClaims', () => ({
  getAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-1'),
}));

import {
  createQREquipmentNote,
  createQRWorkOrder,
  queueOfflineScan,
  readPendingQRWorkingHours,
  updateQRWorkingHours,
} from './equipmentQRActionService';
import { insertOfflineScan } from './equipmentQRPermissions';
import { OfflineQueueService } from '@/services/offlineQueueService';

const ORG_ID = 'org-1';
const equipment = {
  id: 'eq-1',
  name: 'CAT 320',
  organizationId: ORG_ID,
  teamId: 'team-1',
  workingHours: 100,
  defaultPmTemplateId: 'template-default',
};

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });

const queued = () => new OfflineQueueService('user-1', ORG_ID).getAll();

describe('QR scan page actions with no connection', () => {
  beforeEach(() => {
    localStorage.clear();
    mockInsert.mockReset();
    mockFrom.mockClear();
    setOnline(false);
  });

  afterEach(() => setOnline(true));

  it('queues a PM work order with its checklist template instead of calling the server', async () => {
    const result = await createQRWorkOrder({
      equipment,
      title: 'PM - CAT 320',
      description: 'Scheduled PM',
      priority: 'medium',
      attachPM: true,
    });

    expect(result).toEqual({ workOrder: null, creationPhotosAttached: true, queuedOffline: true });
    expect(mockFrom).not.toHaveBeenCalled();
    const [item] = queued();
    expect(item.type).toBe('work_order_create');
    expect(item.payload).toMatchObject({
      title: 'PM - CAT 320',
      equipmentId: 'eq-1',
      hasPM: true,
      pmTemplateId: 'template-default',
    });
  });

  it('refuses a PM work order that has no checklist template rather than queueing a plain one', async () => {
    await expect(
      createQRWorkOrder({
        equipment: { ...equipment, defaultPmTemplateId: null },
        title: 'PM',
        description: 'Scheduled PM',
        priority: 'medium',
        attachPM: true,
      }),
    ).rejects.toThrow('Select a PM checklist template');
    expect(queued()).toHaveLength(0);
  });

  it('queues an hours update', async () => {
    const result = await updateQRWorkingHours({
      organizationId: ORG_ID,
      equipmentId: 'eq-1',
      newHours: 125,
      notes: 'Meter reading',
    });

    expect(result).toEqual({ queuedOffline: true });
    const [item] = queued();
    expect(item.type).toBe('equipment_hours');
    expect(item.payload).toMatchObject({ equipmentId: 'eq-1', newHours: 125, updateSource: 'manual' });
  });

  it('reports the latest hours reading that is still waiting to sync', async () => {
    expect(readPendingQRWorkingHours('user-1', ORG_ID, 'eq-1')).toBeNull();

    await updateQRWorkingHours({ organizationId: ORG_ID, equipmentId: 'eq-1', newHours: 108 });
    await updateQRWorkingHours({ organizationId: ORG_ID, equipmentId: 'eq-1', newHours: 112 });

    expect(readPendingQRWorkingHours('user-1', ORG_ID, 'eq-1')).toBe(112);
    expect(readPendingQRWorkingHours('user-1', ORG_ID, 'eq-2')).toBeNull();
  });

  it('queues a note', async () => {
    const result = await createQREquipmentNote({
      equipmentId: 'eq-1',
      organizationId: ORG_ID,
      content: 'Hydraulic leak at boom',
      images: [],
      isPrivate: false,
    });

    expect(result).toEqual({ queuedOffline: true });
    const [item] = queued();
    expect(item.type).toBe('equipment_note');
    expect(item.payload).toMatchObject({ equipmentId: 'eq-1', content: 'Hydraulic leak at boom' });
  });

  it('keeps a scan with the time it happened and an id for the server row', async () => {
    const scannedAt = '2026-11-22T10:15:00.000Z';

    const scanId = await queueOfflineScan({ organizationId: ORG_ID, equipmentId: 'eq-1', scannedAt });

    const [item] = queued();
    expect(item.type).toBe('equipment_scan');
    expect(item.payload).toEqual({ scanId, equipmentId: 'eq-1', scannedAt, location: null });
  });
});

describe('insertOfflineScan', () => {
  const scan = { scanId: 'scan-1', equipmentId: 'eq-1', scannedAt: '2026-11-22T10:15:00.000Z' };

  beforeEach(() => {
    mockInsert.mockReset();
    mockFrom.mockClear();
  });

  it('records the scan at the time it happened and marks it as recorded offline', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await insertOfflineScan(scan);

    expect(mockFrom).toHaveBeenCalledWith('scans');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'scan-1',
        equipment_id: 'eq-1',
        scanned_by: 'user-1',
        scanned_at: '2026-11-22T10:15:00.000Z',
        location: null,
        notes: expect.stringMatching(/^QR code scan \(recorded offline, synced /),
      }),
    );
  });

  it('treats a scan that already reached the server as recorded, not as a second scan', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(insertOfflineScan(scan)).resolves.toBeUndefined();
  });

  it('fails when the server refuses the scan', async () => {
    mockInsert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });

    await expect(insertOfflineScan(scan)).rejects.toThrow('permission denied');
  });
});
