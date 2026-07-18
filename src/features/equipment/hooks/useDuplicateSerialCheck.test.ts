import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveDuplicateSerialAtSubmit } from './useDuplicateSerialCheck';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import type { DuplicateEquipmentMatch } from '@/features/equipment/services/EquipmentService';

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    findBySerial: vi.fn(),
  },
}));

const mockFindBySerial = vi.mocked(EquipmentService.findBySerial);

describe('resolveDuplicateSerialAtSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses debounced hook result when checkedSerial matches submitted serial', async () => {
    const match: DuplicateEquipmentMatch = {
      id: 'eq-1',
      name: 'CAT 320',
      manufacturer: 'Caterpillar',
      model: '320',
      serial_number: 'SN-1',
      status: 'active',
      team_id: 'team-1',
      team_name: 'Heavy Equipment Team',
    };

    const result = await resolveDuplicateSerialAtSubmit(
      'org-1',
      'SN-1',
      undefined,
      { match, checkedSerial: 'SN-1', isChecking: false, hasValidatedMatch: true },
    );

    expect(result).toEqual(match);
    expect(mockFindBySerial).not.toHaveBeenCalled();
  });

  it('performs immediate lookup when submit serial differs from debounced checkedSerial', async () => {
    mockFindBySerial.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'eq-2',
        name: 'New match',
        manufacturer: 'Bobcat',
        model: 'S770',
        serial_number: 'SN-FAST',
        status: 'active',
        team_id: null,
        team_name: null,
      } satisfies DuplicateEquipmentMatch,
    });

    const result = await resolveDuplicateSerialAtSubmit(
      'org-1',
      'SN-FAST',
      undefined,
      { match: null, checkedSerial: 'SN-OLD', isChecking: false, hasValidatedMatch: true },
    );

    expect(mockFindBySerial).toHaveBeenCalledWith('org-1', 'SN-FAST');
    expect(result?.serial_number).toBe('SN-FAST');
  });

  it('performs immediate lookup when hook has not validated the submitted serial yet', async () => {
    mockFindBySerial.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'eq-3',
        name: 'Reopened form',
        manufacturer: 'CAT',
        model: '320',
        serial_number: 'SN-REOPEN',
        status: 'active',
        team_id: 'team-1',
        team_name: 'Heavy Equipment Team',
      } satisfies DuplicateEquipmentMatch,
    });

    const result = await resolveDuplicateSerialAtSubmit(
      'org-1',
      'SN-REOPEN',
      undefined,
      { match: null, checkedSerial: 'SN-REOPEN', isChecking: false, hasValidatedMatch: false },
    );

    expect(mockFindBySerial).toHaveBeenCalledWith('org-1', 'SN-REOPEN');
    expect(result?.id).toBe('eq-3');
  });
});
