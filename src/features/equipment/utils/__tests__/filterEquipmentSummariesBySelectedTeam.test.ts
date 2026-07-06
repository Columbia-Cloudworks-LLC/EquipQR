import { describe, it, expect } from 'vitest';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import { filterEquipmentSummariesBySelectedTeam } from '@/features/equipment/utils/filterEquipmentSummariesBySelectedTeam';

function makeEquipment(overrides: Partial<EquipmentSummary>): EquipmentSummary {
  return {
    id: overrides.id ?? 'eq-1',
    organization_id: 'org-1',
    name: overrides.name ?? 'Equipment',
    manufacturer: null,
    model: null,
    serial_number: null,
    status: 'active',
    team_id: overrides.team_id ?? null,
    location: null,
    image_url: null,
    working_hours: null,
    last_maintenance: null,
    last_known_location: null,
    team: null,
    team_name: overrides.team_name,
  };
}

describe('filterEquipmentSummariesBySelectedTeam', () => {
  const equipment = [
    makeEquipment({ id: 'eq-1', name: 'Truck A', team_id: 'team-1', team_name: 'Fleet' }),
    makeEquipment({ id: 'eq-2', name: 'Truck B', team_id: null }),
    makeEquipment({ id: 'eq-3', name: 'Truck C', team_id: 'team-2', team_name: 'Yard' }),
  ];

  it('returns all equipment when all teams are selected', () => {
    expect(filterEquipmentSummariesBySelectedTeam(equipment, null)).toHaveLength(3);
  });

  it('returns only unassigned equipment for the unassigned sentinel', () => {
    const filtered = filterEquipmentSummariesBySelectedTeam(equipment, UNASSIGNED_TEAM_ID);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('eq-2');
  });

  it('returns only equipment for the selected team id', () => {
    const filtered = filterEquipmentSummariesBySelectedTeam(equipment, 'team-1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('Truck A');
  });
});
