import { describe, expect, it } from 'vitest';
import type { EquipmentListRow } from '@/features/equipment/services/EquipmentService';
import { filterEquipmentListOffline } from './offlineEquipmentList';

const row = (overrides: Partial<EquipmentListRow> & { id: string; name: string }): EquipmentListRow => ({
  organization_id: 'org-1',
  manufacturer: 'CAT',
  model: '320',
  serial_number: 'SN-1',
  status: 'active',
  team_id: 'team-a',
  location: 'Dallas, TX',
  image_url: null,
  working_hours: 100,
  last_maintenance: null,
  installation_date: '2024-01-01',
  warranty_expiration: null,
  custom_attributes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const rows = [
  row({ id: '1', name: 'CAT 320 Excavator', working_hours: 1500 }),
  row({ id: '2', name: 'Bobcat S650', manufacturer: 'Bobcat', serial_number: 'BOB-77', working_hours: 300, status: 'maintenance', team_id: null }),
  row({ id: '3', name: 'Genie Lift', manufacturer: 'Genie', location: 'Austin, TX', working_hours: null, status: 'inactive', team_id: 'team-b', warranty_expiration: '2026-12-01' }),
];

const names = (result: EquipmentListRow[]) => result.map((item) => item.name);
const byName = { field: 'name', direction: 'asc' } as const;

describe('filterEquipmentListOffline', () => {
  it('returns everything, sorted, with no filters', () => {
    expect(names(filterEquipmentListOffline(rows, {}, byName))).toEqual(['Bobcat S650', 'CAT 320 Excavator', 'Genie Lift']);
  });

  it('searches name, manufacturer, model, serial number and location', () => {
    expect(names(filterEquipmentListOffline(rows, { search: 'bob-77' }, byName))).toEqual(['Bobcat S650']);
    expect(names(filterEquipmentListOffline(rows, { search: 'austin' }, byName))).toEqual(['Genie Lift']);
    expect(names(filterEquipmentListOffline(rows, { search: 'nothing here' }, byName))).toEqual([]);
  });

  it('filters by status, treating out of service as maintenance or inactive', () => {
    expect(names(filterEquipmentListOffline(rows, { status: 'active' }, byName))).toEqual(['CAT 320 Excavator']);
    expect(names(filterEquipmentListOffline(rows, { status: 'out_of_service' }, byName))).toEqual(['Bobcat S650', 'Genie Lift']);
  });

  it('filters by team, including machines with no team', () => {
    expect(names(filterEquipmentListOffline(rows, { team: 'team-b' }, byName))).toEqual(['Genie Lift']);
    expect(names(filterEquipmentListOffline(rows, { team: 'unassigned' }, byName))).toEqual(['Bobcat S650']);
    expect(names(filterEquipmentListOffline(rows, { team: 'all' }, byName))).toHaveLength(3);
  });

  it('filters by manufacturer and location', () => {
    expect(names(filterEquipmentListOffline(rows, { manufacturer: 'Genie' }, byName))).toEqual(['Genie Lift']);
    expect(names(filterEquipmentListOffline(rows, { location: 'Dallas, TX' }, byName))).toEqual(['Bobcat S650', 'CAT 320 Excavator']);
  });

  it('finds warranties expiring within 30 days', () => {
    const now = new Date('2026-11-23T12:00:00Z');
    expect(names(filterEquipmentListOffline(rows, { warrantyExpiring: true }, byName, now))).toEqual(['Genie Lift']);
    expect(filterEquipmentListOffline(rows, { warrantyExpiring: true }, byName, new Date('2026-09-01T12:00:00Z'))).toEqual([]);
  });

  it('sorts numbers as numbers and keeps rows without a value last in both directions', () => {
    expect(names(filterEquipmentListOffline(rows, {}, { field: 'working_hours', direction: 'asc' }))).toEqual([
      'Bobcat S650',
      'CAT 320 Excavator',
      'Genie Lift',
    ]);
    expect(names(filterEquipmentListOffline(rows, {}, { field: 'working_hours', direction: 'desc' }))).toEqual([
      'CAT 320 Excavator',
      'Bobcat S650',
      'Genie Lift',
    ]);
  });
});
