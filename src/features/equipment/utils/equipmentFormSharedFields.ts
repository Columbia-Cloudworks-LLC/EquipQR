import type { EquipmentFormData } from '@/features/equipment/types/equipment';

/** Shared equipment form fields for create/update API payloads. */
export function mapEquipmentFormSharedFields(data: EquipmentFormData) {
  return {
    name: data.name,
    manufacturer: data.manufacturer,
    model: data.model,
    serial_number: data.serial_number,
    status: data.status,
    location: data.location,
    installation_date: data.installation_date,
    warranty_expiration: data.warranty_expiration || null,
    last_maintenance: data.last_maintenance || null,
    notes: data.notes || null,
    custom_attributes: (data.custom_attributes || {}) as Record<string, unknown>,
    image_url: data.image_url || null,
    last_known_location: data.last_known_location || null,
    team_id: data.team_id || null,
    default_pm_template_id: data.default_pm_template_id || null,
    assigned_location_street: data.assigned_location_street || null,
    assigned_location_city: data.assigned_location_city || null,
    assigned_location_state: data.assigned_location_state || null,
    assigned_location_country: data.assigned_location_country || null,
    assigned_location_lat: data.assigned_location_lat ?? null,
    assigned_location_lng: data.assigned_location_lng ?? null,
  };
}
