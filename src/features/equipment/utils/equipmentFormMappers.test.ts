import { describe, it, expect } from 'vitest';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import {
  buildEquipmentCloneDefaultValues,
  toEquipmentCreateData,
} from '@/features/equipment/utils/equipmentFormMappers';

const source: EquipmentRecord = {
  id: 'eq-1',
  name: 'Unit 12',
  manufacturer: 'Caterpillar',
  model: '320',
  serial_number: 'CAT-0012',
  status: 'maintenance',
  location: 'Yard A',
  installation_date: '2023-04-01',
  warranty_expiration: '2027-04-01',
  last_maintenance: '2026-09-01',
  last_maintenance_work_order_id: 'wo-1',
  notes: 'Leaking hydraulic line',
  custom_attributes: { unit_number: '12', qr_tag: 'Q-12' },
  image_url: 'equipment/eq-1/display.jpg',
  last_known_location: { latitude: 1, longitude: 2 },
  team_id: 'team-1',
  customer_id: 'cust-1',
  import_id: 'imp-1',
  organization_id: 'org-1',
  created_at: '2023-04-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  working_hours: 1530,
  default_pm_template_id: 'pm-1',
  use_team_location: false,
  assigned_location_street: '1 Main St',
  assigned_location_city: 'Springfield',
  assigned_location_state: 'IL',
  assigned_location_country: 'US',
  assigned_location_lat: 39.8,
  assigned_location_lng: -89.6,
};

describe('buildEquipmentCloneDefaultValues', () => {
  it('inherits shared specs from the source unit', () => {
    const values = buildEquipmentCloneDefaultValues(source);

    expect(values).toMatchObject({
      name: 'Caterpillar 320',
      manufacturer: 'Caterpillar',
      model: '320',
      location: 'Yard A',
      team_id: 'team-1',
      default_pm_template_id: 'pm-1',
      assigned_location_street: '1 Main St',
      assigned_location_city: 'Springfield',
      assigned_location_state: 'IL',
      assigned_location_country: 'US',
      assigned_location_lat: 39.8,
      assigned_location_lng: -89.6,
    });
  });

  it('leaves unique identifiers, media, and history blank', () => {
    const values = buildEquipmentCloneDefaultValues(source);

    expect(values.serial_number).toBe('');
    expect(values.image_url).toBe('');
    expect(values.notes).toBe('');
    expect(values.custom_attributes).toEqual({});
    expect(values.last_maintenance).toBe('');
    expect(values.warranty_expiration).toBe('');
    expect(values.last_known_location).toBeUndefined();
    expect(values.status).toBe('active');
    expect(values.installation_date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('creates a new record with zero hours and the source customer', () => {
    const values = { ...buildEquipmentCloneDefaultValues(source), serial_number: 'CAT-0013' };
    const createData = toEquipmentCreateData(values, { customerId: source.customer_id });

    expect(createData.serial_number).toBe('CAT-0013');
    expect(createData.customer_id).toBe('cust-1');
    expect(createData.working_hours).toBe(0);
    expect(createData.image_url).toBeNull();
  });
});

describe('toEquipmentCreateData', () => {
  it('defaults customer_id to null', () => {
    const createData = toEquipmentCreateData(buildEquipmentCloneDefaultValues(source));
    expect(createData.customer_id).toBeNull();
  });
});
