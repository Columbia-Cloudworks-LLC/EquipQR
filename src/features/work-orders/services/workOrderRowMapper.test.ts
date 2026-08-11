import { describe, it, expect } from 'vitest';
import {
  mapWorkOrderRow,
  mapEmbeddedEquipment,
  resolveWorkOrderLocation,
} from './workOrderRowMapper';

describe('workOrderRowMapper', () => {
  it('maps a row with null joins', () => {
    const row = {
      id: 'wo-1',
      title: 'Test WO',
      description: 'Desc',
      equipment_id: 'eq-1',
      organization_id: 'org-1',
      priority: 'medium',
      status: 'submitted',
      assignee_id: null,
      assignee_name: null,
      team_id: null,
      created_by: 'user-1',
      created_by_admin: null,
      created_by_name: null,
      created_date: '2026-01-01',
      due_date: null,
      estimated_hours: null,
      completed_date: null,
      acceptance_date: null,
      updated_at: '2026-01-01',
      is_historical: false,
      historical_start_date: null,
      historical_notes: null,
      has_pm: false,
      pm_required: false,
      primary_image_id: null,
      assignee: null,
      equipment: null,
      creator: null,
    };

    const mapped = mapWorkOrderRow(row);

    expect(mapped.id).toBe('wo-1');
    expect(mapped.equipment).toBeNull();
    expect(mapped.assignedTo).toBeNull();
    expect(mapped.effectiveLocation).toBeNull();
  });

  it('maps embedded equipment with team location', () => {
    const equipment = {
      id: 'eq-1',
      organization_id: 'org-1',
      name: 'Compressor',
      manufacturer: 'ACME',
      model: 'X1',
      serial_number: 'SN-1',
      status: 'active',
      working_hours: 100,
      image_url: null,
      team_id: 'team-1',
      location: 'Yard',
      customer_id: null,
      default_pm_template_id: null,
      custom_attributes: null,
      use_team_location: true,
      last_known_location: null,
      assigned_location_lat: null,
      assigned_location_lng: null,
      assigned_location_street: null,
      assigned_location_city: null,
      assigned_location_state: null,
      assigned_location_country: null,
      teams: {
        id: 'team-1',
        name: 'Field Team',
        description: 'Main',
        override_equipment_location: true,
        location_lat: 30.0,
        location_lng: -97.0,
        location_address: '123 Main',
        location_city: 'Austin',
        location_state: 'TX',
        location_country: 'US',
      },
    };

    const embedded = mapEmbeddedEquipment(equipment, 'org-1');
    const location = resolveWorkOrderLocation(equipment);

    expect(embedded?.name).toBe('Compressor');
    expect(embedded?.team?.name).toBe('Field Team');
    expect(location?.source).toBe('team');
    expect(location?.lat).toBe(30.0);
    expect(location?.lng).toBe(-97.0);
  });

  it('resolves last scan location when equipment location is not team-based', () => {
    const equipment = {
      id: 'eq-2',
      organization_id: 'org-1',
      name: 'Pump',
      use_team_location: false,
      assigned_location_lat: null,
      assigned_location_lng: null,
      assigned_location_street: null,
      assigned_location_city: null,
      assigned_location_state: null,
      assigned_location_country: null,
      last_known_location: { latitude: 29.5, longitude: -98.5, name: 'Site A' },
      teams: null,
    };

    const location = resolveWorkOrderLocation(equipment);

    expect(location?.source).toBe('scan');
    expect(location?.sourceLabel).toBe('Last known scan location');
    expect(location?.lat).toBe(29.5);
    expect(location?.lng).toBe(-98.5);
  });
});
