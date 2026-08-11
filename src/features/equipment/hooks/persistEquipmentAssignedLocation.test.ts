import { describe, it, expect, vi } from 'vitest';
import { persistEquipmentAssignedLocation } from '@/features/equipment/hooks/persistEquipmentAssignedLocation';

vi.mock('@/features/equipment/services/equipmentLocationHistoryService', () => ({
  logEquipmentLocationChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('persistEquipmentAssignedLocation', () => {
  it('persists assigned address fields for equipment location saves', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const { logEquipmentLocationChange } = await import(
      '@/features/equipment/services/equipmentLocationHistoryService'
    );

    await persistEquipmentAssignedLocation(
      'eq-1',
      {
        formatted_address: '500 Test Ave, Austin, TX, USA',
        street: '500 Test Ave',
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        lat: 30.27,
        lng: -97.74,
      },
      mutateAsync,
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'eq-1',
      data: {
        assigned_location_street: '500 Test Ave',
        assigned_location_city: 'Austin',
        assigned_location_state: 'TX',
        assigned_location_country: 'USA',
        assigned_location_lat: 30.27,
        assigned_location_lng: -97.74,
        use_team_location: false,
      },
    });
    expect(logEquipmentLocationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        equipmentId: 'eq-1',
        source: 'manual',
        latitude: 30.27,
        longitude: -97.74,
      }),
    );
  });

  it('persists coordinate-only live captures as assigned equipment locations', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});

    await persistEquipmentAssignedLocation(
      'eq-1',
      {
        formatted_address: 'Current device location',
        street: '',
        city: '',
        state: '',
        country: '',
        lat: 32.77,
        lng: -96.79,
      },
      mutateAsync,
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      id: 'eq-1',
      data: {
        assigned_location_street: null,
        assigned_location_city: null,
        assigned_location_state: null,
        assigned_location_country: null,
        assigned_location_lat: 32.77,
        assigned_location_lng: -96.79,
        use_team_location: false,
      },
    });
  });
});
