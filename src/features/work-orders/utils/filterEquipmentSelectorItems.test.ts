import { describe, expect, it } from 'vitest';
import type { EquipmentSelectorItem } from '@/features/work-orders/types/workOrderEquipment';
import { filterEquipmentSelectorItems } from './filterEquipmentSelectorItems';

const mockEquipment: EquipmentSelectorItem[] = [
  {
    id: 'eq-1',
    name: 'CAT 320 Excavator',
    manufacturer: 'Caterpillar',
    model: '320',
    serial_number: 'SN-001',
    location: 'Yard A',
    team: { id: 'team-1', name: 'Field Crew' },
    working_hours: 1200,
  },
  {
    id: 'eq-2',
    name: 'Toyota Forklift',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TF-99',
    last_known_location: { name: 'Warehouse B' },
    team: { id: 'team-2', name: 'Warehouse' },
  },
];

describe('filterEquipmentSelectorItems', () => {
  it('returns all equipment when search query is empty', () => {
    expect(filterEquipmentSelectorItems(mockEquipment, '')).toHaveLength(2);
    expect(filterEquipmentSelectorItems(mockEquipment, '   ')).toHaveLength(2);
  });

  it('filters by name', () => {
    const filtered = filterEquipmentSelectorItems(mockEquipment, 'toyota');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('eq-2');
  });

  it('filters by manufacturer, model, and serial number', () => {
    expect(filterEquipmentSelectorItems(mockEquipment, 'caterpillar')).toHaveLength(1);
    expect(filterEquipmentSelectorItems(mockEquipment, '8fgu25')).toHaveLength(1);
    expect(filterEquipmentSelectorItems(mockEquipment, 'sn-001')).toHaveLength(1);
  });

  it('filters by team name and location', () => {
    expect(filterEquipmentSelectorItems(mockEquipment, 'field crew')).toHaveLength(1);
    expect(filterEquipmentSelectorItems(mockEquipment, 'warehouse b')).toHaveLength(1);
    expect(filterEquipmentSelectorItems(mockEquipment, 'yard a')).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterEquipmentSelectorItems(mockEquipment, 'bulldozer')).toHaveLength(0);
  });
});
