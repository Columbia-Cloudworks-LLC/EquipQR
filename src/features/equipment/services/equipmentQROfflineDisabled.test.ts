import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpdateHours = vi.hoisted(() => vi.fn());
const mockCreateNote = vi.hoisted(() => vi.fn());

vi.mock('@/lib/flags', async () => ({
  ...(await vi.importActual<typeof import('@/lib/flags')>('@/lib/flags')),
  OFFLINE_QUEUE_ENABLED: false,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/lib/authClaims', () => ({
  getAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthClaims: vi.fn().mockResolvedValue({ sub: 'user-1' }),
  requireAuthUserIdFromClaims: vi.fn().mockResolvedValue('user-1'),
}));

vi.mock('@/features/equipment/services/equipmentWorkingHoursService', () => ({
  updateEquipmentWorkingHours: mockUpdateHours,
}));

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  createEquipmentNoteWithImages: mockCreateNote,
}));

import {
  CONNECTION_REQUIRED_MESSAGE,
  createQREquipmentNote,
  createQRWorkOrder,
  queueOfflineScan,
  updateQRWorkingHours,
} from './equipmentQRActionService';
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

// With offline saving switched off nothing replays the queue, so a change
// must never be reported as "saved on this device".
describe('QR scan page actions when offline saving is switched off', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUpdateHours.mockReset().mockResolvedValue({});
    mockCreateNote.mockReset().mockResolvedValue({});
  });

  afterEach(() => setOnline(true));

  it('asks for a connection instead of queueing when there is none', async () => {
    setOnline(false);

    await expect(
      createQRWorkOrder({ equipment, title: 'Leak', description: 'D', priority: 'medium', attachPM: false }),
    ).rejects.toThrow(CONNECTION_REQUIRED_MESSAGE);
    await expect(
      updateQRWorkingHours({ organizationId: ORG_ID, equipmentId: 'eq-1', newHours: 125 }),
    ).rejects.toThrow(CONNECTION_REQUIRED_MESSAGE);
    await expect(
      createQREquipmentNote({
        equipmentId: 'eq-1',
        organizationId: ORG_ID,
        content: 'Note',
        images: [],
        isPrivate: false,
      }),
    ).rejects.toThrow(CONNECTION_REQUIRED_MESSAGE);
    await expect(
      queueOfflineScan({ organizationId: ORG_ID, equipmentId: 'eq-1', scannedAt: '2026-11-22T10:15:00.000Z' }),
    ).rejects.toThrow(CONNECTION_REQUIRED_MESSAGE);

    expect(queued()).toHaveLength(0);
    expect(mockUpdateHours).not.toHaveBeenCalled();
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  it('saves hours and notes straight to the server when connected', async () => {
    setOnline(true);

    await expect(
      updateQRWorkingHours({ organizationId: ORG_ID, equipmentId: 'eq-1', newHours: 125 }),
    ).resolves.toEqual({ queuedOffline: false });
    await expect(
      createQREquipmentNote({
        equipmentId: 'eq-1',
        organizationId: ORG_ID,
        content: 'Note',
        images: [],
        isPrivate: false,
      }),
    ).resolves.toEqual({ queuedOffline: false });

    expect(mockUpdateHours).toHaveBeenCalledWith(
      expect.objectContaining({ equipmentId: 'eq-1', newHours: 125, updateSource: 'manual' }),
    );
    expect(mockCreateNote).toHaveBeenCalledTimes(1);
    expect(queued()).toHaveLength(0);
  });
});
